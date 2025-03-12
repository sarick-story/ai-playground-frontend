import { NextRequest } from "next/server";
import { googleAuth } from "./auth";

// This is a proxy endpoint that forwards requests to the backend
export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request body
    const { messages, conversation_id } = await req.json();

    // The URL of your private Cloud Run service
    // const backendUrl = "https://apb-tony-fork-136402401870.us-central1.run.app";
    const backendUrl =
      "https://ai-playground-backend-136402401870.us-central1.run.app";

    // 1. Create a GoogleAuth client

    // 2. Retrieve an ID token client with the Cloud Run URL as the target audience
    const idTokenClient = await googleAuth.getIdTokenClient(backendUrl);

    // 3. Get request headers from the ID token client (contains `Authorization: Bearer <ID_TOKEN>`)
    const authHeaders = await idTokenClient.getRequestHeaders();

    console.log("Forwarding request to backend:", `${backendUrl}/api/chat`);

    // 4. Forward the request to the backend server using the ID token
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders, // Pass in the ID token-based Authorization header
      },
      body: JSON.stringify({
        messages,
        conversation_id,
      }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      console.error("Backend error:", response.status, response.statusText);

      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
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

    // If the backend returns a streaming text/event-stream (SSE) response
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
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

    // For non-streaming responses, return JSON
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
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
