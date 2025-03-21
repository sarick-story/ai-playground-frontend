import { NextRequest } from "next/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// This is a dedicated endpoint for transaction handling
export async function POST(req: NextRequest) {
  try {
    // Parse request body and extract parameters
    const body = await req.json();
    const { to_address, amount, wallet_address, private_key } = body;
    
    // Add debug logging
    console.log("Transaction request:", {
      to_address,
      amount,
      wallet_address: wallet_address ? `${wallet_address.slice(0, 6)}...${wallet_address.slice(-4)}` : 'none',
      has_private_key: !!private_key  // Only log whether a key exists, never log the actual key
    });
    
    if (!to_address || !amount || !wallet_address) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Prepare request body - include private_key only if provided
    const requestBody: any = {
      to_address,
      amount,
      wallet_address
    };
    
    // Only include private_key if it exists
    if (private_key) {
      requestBody.private_key = private_key;
    }
    
    // Forward the request to the backend transaction endpoint
    const response = await fetch(`${BACKEND_URL}/api/transaction`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Check if the fetch was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Transaction API request failed: ${response.status} ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Transaction API request failed: ${errorText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return the transaction data from the backend
    const data = await response.json();
    console.log("Received transaction response:", data);
    
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in transaction API route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 