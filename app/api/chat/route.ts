import { NextRequest } from 'next/server';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// This is a proxy endpoint that forwards requests to the backend
export async function POST(req: NextRequest) {
  try {
    // Get the request body which should include messages AND conversation_id
    const { messages, conversation_id } = await req.json();
    
    console.log('Forwarding request to backend:', `${BACKEND_URL}/api/chat`);
    
    // Forward the request to the backend server
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers if present
        ...(req.headers.get('authorization') 
            ? { 'Authorization': req.headers.get('authorization')! } 
            : {}),
      },
      body: JSON.stringify({
        messages,
        conversation_id // Use the conversation_id from the request
      }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      console.error('Backend error:', response.status, response.statusText);
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: 'Failed to parse error response' };
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData?.message || errorData || 'Failed to fetch from backend',
          status: response.status 
        }),
        { 
          status: response.status, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // For streaming responses, we need to forward the response as-is
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Get the response body as a ReadableStream
      const body = response.body;
      if (!body) {
        throw new Error('No response body from backend');
      }
      
      // Return a streaming response
      return new Response(body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'x-vercel-ai-data-stream': response.headers.get('x-vercel-ai-data-stream') || 'v1',
        },
      });
    }

    // For non-streaming responses, return the JSON data
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat API route:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 