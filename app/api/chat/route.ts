import { NextRequest } from "next/server";
import { googleAuth } from "./auth";
import { StreamingTextResponse } from 'ai';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function generateHeaders() {
  // Default headers
  const headers = {
    "Content-Type": "application/json",
  };

  // Only attempt to add auth headers if GOOGLE_KEY_JSON is provided
  if (process.env.GOOGLE_KEY_JSON) {
    try {
      const idTokenClient = await googleAuth.getIdTokenClient(BACKEND_URL);
      const authHeaders = await idTokenClient.getRequestHeaders();
      return {
        ...headers,
        ...authHeaders,
      };
    } catch (error) {
      console.warn("Failed to generate auth headers:", error);
      // Continue without auth headers
    }
  }

  return headers;
}

// Generate a mock response for local development when backend is unavailable
function generateMockResponse(messages: any[]) {
  const lastUserMessage = messages.findLast(msg => msg.role === 'user')?.content || '';
  
  return {
    id: `mock-${Date.now()}`,
    content: `This is a mock response for local development. You said: "${lastUserMessage}". The backend server is not available. Please check your BACKEND_URL environment variable and ensure the backend server is running.`,
    role: 'assistant',
  };
}

// This is a proxy endpoint that forwards requests to the backend
export async function POST(req: NextRequest) {
  try {
    // Parse request body and extract parameters
    const body = await req.json();
    const { messages, walletAddress, mcp_type = "sdk" } = body;
    
    // Generate headers for authentication if needed
    const headers = await generateHeaders();
    
    console.log(`Processing chat message with wallet: ${walletAddress || 'none'}, MCP: ${mcp_type}`);
    
    // Forward the request to your backend
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        messages: messages,
        wallet_address: walletAddress,  // Pass wallet address to backend
        mcp_type: mcp_type,             // Specify MCP type (default is sdk)
        conversation_id: body.conversation_id || null // Forward conversation ID if available
      }),
    });

    // Check if the fetch was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API request failed: ${response.status} ${errorText}`);
    }

    // Create a stream from the response
    const stream = response.body;
    if (!stream) {
      throw new Error('No stream returned from chat API');
    }
    
    // Return streaming response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // If the backend is completely unreachable, return a mock response
    if ((error as Error).message.includes('ECONNREFUSED') || 
        (error as Error).message.includes('Failed to fetch')) {
      console.warn('Backend connection error. Returning mock response for local development');
      return new Response(
        JSON.stringify(generateMockResponse((await req.json()).messages || [])),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'An error occurred during the chat request',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
