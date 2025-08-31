import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";

import { googleAuth } from "./auth";

// Create a new ratelimiter, that allows 5 requests per 1 minute
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
});

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
  const lastUserMessage =
    messages.findLast((msg) => msg.role === "user")?.content || "";

  return {
    id: `mock-${Date.now()}`,
    content: `This is a mock response for local development. You said: "${lastUserMessage}". The backend server is not available. Please check your BACKEND_URL environment variable and ensure the backend server is running.`,
    role: "assistant",
  };
}

// This is a proxy endpoint that forwards requests to the backend
export async function POST(req: NextRequest) {
  try {
    // Identify the user/IP to rate-limit on.
    // See: https://github.com/vercel/next.js/discussions/33435
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for") ||
      "fallback_identifier";

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    const rateLimitHeaders: Record<string, string> = {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
    };

    if (!success) {
      return new Response(
        JSON.stringify({
          message: "Too many requests. You have been rate-limited.",
          rateLimitState: { success, limit, remaining, reset },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      );
    }

    // Get the request body which should include messages AND conversation_id
    const body = await req.json();
    const { messages, conversation_id, wallet_address, mcp_type } = body;
    
    // Extract the latest user message from the messages array
    const latestUserMessage = messages?.findLast((msg: any) => msg.role === 'user')?.content || '';
    
    // Log what we're processing
    console.log("Request body:", JSON.stringify({ wallet_address, mcp_type, messagesCount: messages?.length || 0 }));
    console.log("Processing chat message with wallet:", wallet_address || 'none', "MCP:", mcp_type || 'default');
    console.log("Latest user message:", latestUserMessage.substring(0, 100) + (latestUserMessage.length > 100 ? '...' : ''));

    // Generate headers with error handling
    let headers;
    try {
      headers = await generateHeaders();
    } catch (error) {
      console.error("Error generating headers:", error);
      headers = { "Content-Type": "application/json" };
    }

    try {
      // Forward the request to the backend server with single message
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: latestUserMessage,  // Send single message instead of messages array
          conversation_id,
          wallet_address,
          mcp_type
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        console.error("Backend error:", response.status, response.statusText);
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: "Failed to parse error response" };
        }

        return new Response(
          JSON.stringify({
            error:
              errorData?.message || errorData || "Failed to fetch from backend",
            status: response.status,
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if the response is JSON (for transactions) or streaming (for chat)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // This is a JSON response, not a streaming response
        console.log("Received JSON response from backend");
        const jsonData = await response.json();
        return Response.json(jsonData);
      }

      // For streaming responses, pass through using Vercel AI SDK text protocol headers
      // This aligns with useChat({ streamProtocol: 'text' }) on the client
      console.log("Streaming response detected, content-type:", contentType);
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          // Signal to the Vercel AI SDK to use the text streaming parser
          "x-acme-stream-format": "text",
          "x-vercel-ai-stream-data": "text"
        },
      });
    } catch (error) {
      console.warn("Backend connection error:", error);
      console.log("Returning mock response for local development");

      // Return a mock response for local development
      const mockResponse = generateMockResponse(messages || []);
      return new Response(JSON.stringify(mockResponse), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in chat API route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
