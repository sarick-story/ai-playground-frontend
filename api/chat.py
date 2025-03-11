import os
import json
from typing import List, AsyncGenerator, Optional
from pydantic import BaseModel
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import asyncio
import traceback
import uuid

from .mcp_agent import run_agent

load_dotenv()

# Set up logging
import logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

class Message(BaseModel):
    role: str
    content: str

class Request(BaseModel):
    messages: List[Message]

async def stream_agent_response(messages: List[Message]) -> AsyncGenerator[str, None]:
    """
    Stream the agent's response using the Vercel AI SDK streaming format.
    
    Format follows the Vercel AI SDK protocol:
    - Text chunks: 0:{"text":"string content"}
    - Tool calls: 9:{"toolCallId":"id","toolName":"name","args":{}}
    - Tool results: a:{"toolCallId":"id","toolName":"name","args":{},"result":{}}
    - End of stream: e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}
    """
    # Get the last user message
    last_message = messages[-1].content if messages and messages[-1].role == "user" else ""
    
    logger.info(f"Processing user message: {last_message[:50]}...")
    
    if not last_message:
        logger.warning("No user message found")
        yield "No user message found.\n"
        return
    
    # Create a queue to receive streamed content from the agent
    queue = asyncio.Queue()
    logger.info("Created queue for agent streaming")
    
    # Start the agent in a background task
    async def run_agent_task():
        try:
            logger.info("Starting run_agent task")
            await run_agent(last_message, queue)
            logger.info("run_agent task completed")
            # Signal end of stream
            await queue.put(None)
        except Exception as e:
            logger.error(f"Error in run_agent_task: {str(e)}")
            logger.error(traceback.format_exc())
            await queue.put({"error": str(e)})
            await queue.put(None)  # Ensure we signal completion even on error
    
    # Start the agent task
    logger.info("Creating agent task")
    agent_task = asyncio.create_task(run_agent_task())
    
    # Buffer to collect all text chunks
    text_buffer = []
    
    try:
        # Stream responses from the queue
        logger.info("Starting to stream responses from queue")
        item_count = 0
        
        # Skip tool calls and tool results, only process text chunks
        while True:
            try:
                logger.debug("Waiting for next item from queue")
                item = await asyncio.wait_for(queue.get(), timeout=60.0)  # Add timeout to prevent hanging
                
                if item is None:
                    logger.info("Received None from queue, ending stream")
                    break
                
                item_count += 1
                logger.debug(f"Received item {item_count} from queue: {str(item)[:100]}...")
                
                # Only process text chunks, skip tool calls and results
                if isinstance(item, dict) and "error" in item:
                    logger.error(f"Error from agent: {item['error']}")
                    yield f"Error: {item['error']}\n"
                    break
                elif isinstance(item, dict):
                    # Skip all dictionary items (tool calls, tool results, etc.)
                    continue
                elif isinstance(item, str):
                    # Only yield plain text
                    if not (item.startswith('{') or item.startswith('e:{')):
                        yield item
            except asyncio.TimeoutError:
                logger.warning("Timeout waiting for queue item, ending stream")
                yield "Timeout waiting for response from agent\n"
                break
            except Exception as e:
                logger.error(f"Error processing queue item: {str(e)}")
                logger.error(traceback.format_exc())
                yield f"Error: {str(e)}\n"
                break
    except Exception as e:
        logger.error(f"Error in stream_agent_response: {str(e)}")
        logger.error(traceback.format_exc())
        yield f"Error: {str(e)}\n"
    finally:
        # Ensure the agent task is properly cleaned up
        logger.info("Cleaning up agent task")
        if not agent_task.done():
            logger.info("Cancelling agent task")
            agent_task.cancel()
            try:
                await agent_task
            except asyncio.CancelledError:
                logger.info("Agent task cancelled")
                pass
            except Exception as e:
                logger.error(f"Error cancelling agent task: {str(e)}")
                pass

@app.post("/chat")
async def handle_chat(request: Request, protocol: str = Query('data')):
    logger.info(f"Received chat request with {len(request.messages)} messages")
    response = StreamingResponse(
        stream_agent_response(request.messages),
        media_type='text/event-stream',  # This is correct
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream',
            'Transfer-Encoding': 'chunked',
            'x-vercel-ai-data-stream': 'v1'  # This header is critical
        }
    )
    return response
