# MCP Playground Project Memory

## Architecture Overview

This project integrates:
1. **MCP (Multi-Chain Protocol)** - For blockchain interactions
2. **LangGraph** - For agent orchestration
3. **Vercel AI SDK** - For streaming responses
4. **Next.js** - For the frontend

## Key Components

### Backend (Python)
- `api/chat.py` - FastAPI endpoint that handles chat requests and streams responses
- `api/mcp_agent.py` - LangGraph agent that uses MCP tools
- `api/index.py` - Main API entry point that mounts the chat app

### Frontend (Next.js)
- `app/page.tsx` - Main page with chat interface using Vercel AI SDK
- `app/api/chat/route.ts` - Next.js API route that handles streaming between Python backend and frontend (Alternative approach)

## Integration Patterns

### Streaming Pattern
1. Frontend uses Vercel AI SDK's `useChat` hook
2. Backend uses FastAPI's `StreamingResponse` with the Vercel AI SDK protocol
3. LangGraph agent streams responses through an asyncio Queue

### Direct API Connection (Preferred)
1. Configure Next.js rewrites to proxy requests directly to the Python API
2. Disable compression in Next.js config to prevent streaming issues
3. Use the useChat hook with the rewritten API path

### Vercel AI SDK Protocol
- Text chunks: `0:{"text"}`
- Tool calls: `9:{"toolCallId":"id","toolName":"name","args":{}}`
- Tool results: `a:{"toolCallId":"id","toolName":"name","args":{},"result":{}}`
- End of stream: `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}`

## Deployment Considerations
- Ensure `vercel.json` is properly configured for API routes
- Install all required dependencies in `requirements.txt`
- Set up environment variables for API keys

## Lessons Learned
1. LangGraph agents can be integrated with Vercel AI SDK through custom streaming handlers
2. AsyncIO queues are effective for passing data between the agent and the streaming response
3. The Vercel AI SDK protocol requires specific formatting for different types of messages 
4. When facing streaming issues with the Vercel AI SDK, implementing a custom Next.js API route that acts as a proxy between the frontend and Python backend can resolve compatibility problems
5. The custom API route should properly parse and transform the streaming format from the Python backend to be compatible with the Vercel AI SDK's StreamingTextResponse
6. Running both the Next.js frontend and Python backend simultaneously is essential for development, which can be automated with a shell script
7. Disabling compression in Next.js config can help with streaming issues
8. Using Next.js rewrites to proxy requests directly to the Python API is often simpler than implementing a custom API route

## Troubleshooting

### Streaming Issues
If streaming is not working properly:
1. Check that the Python backend is running on the expected port (8000)
2. Ensure the Next.js API route is correctly parsing the streaming format
3. Verify that the Vercel AI SDK protocol is being followed correctly
4. Use browser developer tools to check for network errors or console errors
5. Try disabling compression in Next.js config
6. Use Next.js rewrites to proxy requests directly to the Python API

### API Endpoint Issues
If the API endpoints are not accessible:
1. Check that the FastAPI app is mounted correctly in `api/index.py`
2. Verify that the endpoint paths in `api/chat.py` match the expected paths
3. Ensure the Next.js rewrites are configured correctly in `next.config.ts`
4. Test the API endpoints directly using curl or Postman

### Development Setup
Use the `dev.sh` script to run both the Next.js frontend and Python backend simultaneously:
```bash
./dev.sh
``` 