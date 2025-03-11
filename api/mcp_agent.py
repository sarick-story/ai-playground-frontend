# Create server parameters for stdio connection
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools # type: ignore
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
import os
import asyncio
import json
import uuid
import traceback
import sys
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from langchain_core.callbacks.base import BaseCallbackHandler

load_dotenv()

# Set up logging
import logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

model = ChatOpenAI(model="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY"), streaming=True)

# Define system prompt
system_prompt = """You are a helpful blockchain analytics assistant on the Story L1 Blockchain. When using tools, be thorough in your analysis 
and always explain the significance of the statistics you find. Present information in a clear, organized manner.
You have access to several tools that you can call to help you. Remember the coin is $IP and the data is coming from blockscout API."""

async def run_agent(user_message: str, queue: Optional[asyncio.Queue] = None):
    """
    Run the agent with the given user message.
    
    Args:
        user_message: The user's message to process
        queue: Optional queue to stream responses to
    
    Returns:
        The final response if queue is None
    """
    logger.info(f"Starting run_agent with message: {user_message[:50]}...")

    # Assuming all repos are at the same level in parent directory
    server_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                          "story-mcp-hub/storyscan-mcp/server.py")
    logger.info(f"Server path: {server_path}")
    
    if not os.path.exists(server_path):
        error_msg = f"Server file not found at {server_path}"
        logger.error(error_msg)
        if queue:
            await queue.put({"error": error_msg})
        raise FileNotFoundError(error_msg)
    
    server_params = StdioServerParameters(
        command="python",
        args=[server_path],
    )

    try:
        logger.info("Initializing stdio client")
        async with stdio_client(server_params) as (read, write):
            logger.info("Stdio client initialized, creating session")
            async with ClientSession(read, write) as session:
                try:
                    # Initialize the connection
                    logger.info("Initializing MCP session")
                    await session.initialize()
                    logger.info("MCP session initialized successfully")

                    # Get tools
                    logger.info("Loading MCP tools")
                    tools = await load_mcp_tools(session)
                    logger.info(f"Loaded {len(tools)} MCP tools")
                    
                    # Log tool names for debugging
                    tool_names = [tool.name for tool in tools]
                    logger.info(f"Available tools: {', '.join(tool_names)}")

                    # Create the agent with system prompt
                    logger.info("Creating agent with system prompt")
                    agent = create_react_agent(
                        model, 
                        tools,
                        state_modifier=system_prompt
                    )
                    
                    logger.info("Agent created, preparing to invoke")
                    
                    # Configure streaming callbacks if queue is provided
                    if queue:
                        # Define a callback handler for streaming
                        class StreamingCallbackHandler(BaseCallbackHandler):
                            # Add the run_inline attribute
                            run_inline = True
                            
                            async def on_llm_new_token(self, token: str, **kwargs):
                                logger.debug(f"LLM token: {token}")
                                await queue.put(token)
                            
                            async def on_tool_start(self, tool_name: str, tool_input: Dict[str, Any], **kwargs):
                                tool_call_id = str(uuid.uuid4())
                                logger.info(f"Starting tool: {tool_name} with input: {tool_input}")
                                await queue.put({
                                    "tool_call": {
                                        "id": tool_call_id,
                                        "name": tool_name,
                                        "args": tool_input
                                    }
                                })
                                return tool_call_id
                            
                            async def on_tool_end(self, output: str, **kwargs):
                                # Extract the necessary information from kwargs
                                tool_call_id = kwargs.get("run_id", str(uuid.uuid4()))
                                tool_name = kwargs.get("name", "unknown_tool")
                                tool_input = kwargs.get("input", {})
                                
                                logger.info(f"Tool completed: {tool_name}")
                                logger.debug(f"Tool output: {output}")
                                
                                # Convert the output to a string if it's not already
                                if hasattr(output, "content"):
                                    # If it's a ToolMessage or similar object with content attribute
                                    output_str = str(output.content)
                                elif hasattr(output, "__str__"):
                                    # If it has a string representation
                                    output_str = str(output)
                                else:
                                    # Fallback
                                    output_str = "Tool execution completed"
                                
                                await queue.put({
                                    "tool_result": {
                                        "id": tool_call_id,
                                        "name": tool_name,
                                        "args": tool_input,
                                        "result": output_str
                                    }
                                })
                        
                        # Create callback config
                        callbacks = [StreamingCallbackHandler()]
                        
                        # Run the agent with streaming
                        logger.info("Starting agent with streaming")
                        try:
                            result = await agent.ainvoke(
                                {"messages": [("user", user_message)]},
                                config={"callbacks": callbacks}
                            )
                            logger.info("Agent completed execution with streaming")
                        except Exception as e:
                            logger.error(f"Error during agent execution with streaming: {str(e)}")
                            logger.error(traceback.format_exc())
                            await queue.put({"error": str(e)})
                            raise
                        
                        # Signal completion
                        logger.info("Signaling completion")
                        await queue.put({"done": True})
                        
                        # Return the final result
                        return result
                    else:
                        # Run the agent without streaming
                        logger.info("Starting agent without streaming")
                        try:
                            result = await agent.ainvoke({"messages": [("user", user_message)]})
                            logger.info("Agent completed execution without streaming")
                            return result
                        except Exception as e:
                            logger.error(f"Error during agent execution without streaming: {str(e)}")
                            logger.error(traceback.format_exc())
                            raise
                except Exception as e:
                    logger.error(f"Error in MCP session: {str(e)}")
                    logger.error(traceback.format_exc())
                    if queue:
                        await queue.put({"error": str(e)})
                    raise
    except Exception as e:
        logger.error(f"Error in stdio client: {str(e)}")
        logger.error(traceback.format_exc())
        if queue:
            await queue.put({"error": str(e)})
        raise

# Run the async function
if __name__ == "__main__":
    asyncio.run(run_agent("give me some blockchain stats"))