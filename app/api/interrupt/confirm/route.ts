import { NextRequest } from "next/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// This is a dedicated endpoint for interrupt confirmation handling
export async function POST(req: NextRequest) {
  try {
    // Parse request body and extract parameters
    const body = await req.json();
    const { interrupt_id, conversation_id, confirmed, wallet_address } = body;
    
    // Add debug logging
    console.log("Interrupt confirmation request:", {
      interrupt_id,
      conversation_id,
      confirmed,
      wallet_address: wallet_address ? `${wallet_address.slice(0, 6)}...${wallet_address.slice(-4)}` : 'none'
    });
    
    if (!interrupt_id || !conversation_id || confirmed === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Prepare request body
    const requestBody = {
      interrupt_id,
      conversation_id,
      confirmed,
      wallet_address
    };
    
    // Forward the request to the backend interrupt confirmation endpoint
    const response = await fetch(`${BACKEND_URL}/api/interrupt/confirm`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Check if the fetch was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Interrupt confirmation API request failed: ${response.status} ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Interrupt confirmation failed: ${errorText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return the response data from the backend
    const data = await response.json();
    console.log("Received interrupt confirmation response:", data);
    
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in interrupt confirmation API route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}