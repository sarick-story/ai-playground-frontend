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
    const { messages, conversation_id } = await req.json();

    // Use different URLs for different environments
    const backendUrl =
      process.env.VERCEL_ENV === "production"
        ? process.env.BACKEND_URL // Cloud Run URL in production
        : process.env.BACKEND_URL || "http://localhost:8000"; // Local development

    console.log("Forwarding request to backend:", `${backendUrl}/api/chat`);

    // Generate headers with error handling
    let headers;
    try {
      headers = await generateHeaders();
    } catch (error) {
      console.error("Error generating headers:", error);
      headers = { "Content-Type": "application/json" };
    }

    try {
      // Forward the request to the backend server
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages,
          conversation_id, // Use the conversation_id from the request
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

      // For streaming responses, we need to forward the response as-is
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        // Get the response body as a ReadableStream
        const body = response.body;
        if (!body) {
          throw new Error("No response body from backend");
        }

        // Return a streaming response
        return new Response(body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "x-vercel-ai-data-stream":
              response.headers.get("x-vercel-ai-data-stream") || "v1",
          },
        });
      }

      // For non-streaming responses, return the JSON data
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.warn("Backend connection error:", error);
      console.log("Returning mock response for local development");

      // Return a mock response for local development
      const mockResponse = generateMockResponse(messages);
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
