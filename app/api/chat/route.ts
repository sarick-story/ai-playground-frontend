import { NextRequest } from "next/server";
import { googleAuth } from "./auth";

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
    // Parse the request body
    const body = await req.json();
    const { messages, conversation_id, wallet_address, mcp_type, prompt } = body;
    const messagesCount = messages.length;
    
    // Add debugging
    console.log("Request body:", JSON.stringify({ wallet_address, mcp_type, messagesCount }));
    console.log("Processing chat message with wallet:", wallet_address || 'none', "MCP:", mcp_type || 'default');
    
    // Get the backend URL from environment variables or use default
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
    
    // Make the request to the backend API based on the prompt type
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        conversation_id,
        wallet_address,
        mcp_type
      }),
    });
    
    // Check if the response is JSON (for transactions) or streaming (for chat)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // Transaction response - return it directly
      console.log("Received JSON response from backend (transaction)");
      const jsonData = await response.json();
      return Response.json(jsonData);
    }
    
    // For streaming responses, proceed with normal stream handling
    try {
      // Generate headers for authentication if needed
      const headers = await generateHeaders();
      
      console.log(`Processing chat message with wallet: ${wallet_address || 'none'}, MCP: ${mcp_type}`);
      
      // Forward the request to your backend
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          messages: messages,
          wallet_address: wallet_address,  // Pass wallet address to backend
          mcp_type: mcp_type,             // Specify MCP type (default is sdk)
          conversation_id: body.conversation_id || null // Forward conversation ID if available
        }),
      });

      // Check if the fetch was successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat API request failed: ${response.status} ${errorText}`);
      }

      // Format the response for Vercel AI SDK consumption
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      if (response.body) {
        const reader = response.body.getReader();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              let transactionBuffer = ""; // Buffer to collect transaction intent data
              let isCollectingTransaction = false;
              let incompleteChunk = ""; // Buffer for incomplete chunks that might be split across reads
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  // If we were collecting a transaction, ensure it's properly sent
                  if (isCollectingTransaction && transactionBuffer) {
                    const formattedTransactionChunk = "data: " + JSON.stringify({ type: "text", text: transactionBuffer }) + "\n\n";
                    controller.enqueue(encoder.encode(formattedTransactionChunk));
                  }
                  
                  // If there's any incomplete content, send it as a final chunk
                  if (incompleteChunk) {
                    const formattedFinalChunk = "data: " + JSON.stringify({ type: "text", text: incompleteChunk }) + "\n\n";
                    controller.enqueue(encoder.encode(formattedFinalChunk));
                  }
                  
                  // If we're streaming a Storyscan MCP response, ensure it gets fully received
                  if (req.body && (await req.clone().json()).mcp_type === 'storyscan') {
                    console.log("Processing Storyscan response - ensuring all chunks are handled");
                    // Additional logging to ensure Storyscan responses are visible
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "text", text: "\n" }) + "\n\n"));
                  }
                  
                  controller.close();
                  break;
                }
                
                // Convert binary chunk to text
                const chunk = decoder.decode(value, { stream: true });
                
                // Log what we're receiving for debugging
                console.log(`Received chunk (${chunk.length} chars):`, chunk.slice(0, 200) + (chunk.length > 200 ? "..." : ""));
                
                // Combine with any incomplete chunk from the previous iteration
                const fullChunk = incompleteChunk + chunk;
                // Reset the incomplete chunk buffer
                incompleteChunk = "";
                
                // Check if this chunk contains the start of a transaction intent
                if (fullChunk.includes('Transaction intent:')) {
                  console.log("Transaction intent marker detected in chunk");
                  // We no longer need to buffer transactions separately since they'll be handled
                  // by a separate API call. Just pass through as normal text.
                  const formattedChunk = "data: " + JSON.stringify({ type: "text", text: fullChunk }) + "\n\n";
                  controller.enqueue(encoder.encode(formattedChunk));
                  continue;
                }
                
                // If we're collecting transaction data, keep adding to the buffer
                if (isCollectingTransaction) {
                  // We're no longer collecting transactions this way, but this is a fallback
                  // in case there's any ongoing collection
                  transactionBuffer += fullChunk;
                  
                  // Check if we've collected the complete transaction
                  if (fullChunk.includes('```') && transactionBuffer.includes('```json') && 
                      transactionBuffer.lastIndexOf('```') > transactionBuffer.indexOf('```json')) {
                    // Just pass it through as normal text
                    const formattedChunk = "data: " + JSON.stringify({ type: "text", text: transactionBuffer }) + "\n\n";
                    controller.enqueue(encoder.encode(formattedChunk));
                    transactionBuffer = ""; // Reset buffer
                    isCollectingTransaction = false;
                  }
                  continue; // Keep reading chunks
                }
                
                // Process the full chunk - simplified for reliability
                const formattedChunk = "data: " + JSON.stringify({ type: "text", text: fullChunk }) + "\n\n";
                controller.enqueue(encoder.encode(formattedChunk));

                // Send an extra debug log
                console.log(`Processed and enqueued chunk with length ${fullChunk.length}`);
              }
            } catch (e) {
              console.error('Stream error:', e);
              controller.error(e);
            }
          }
        });
        
        // Return the formatted stream
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      // If no body, return an error
      return new Response(
        JSON.stringify({ error: "No response body from backend" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.warn("Backend connection error:", error);
      console.log("Returning mock response for local development");
      
      // Return a mock response for local development
      const mockResponse = generateMockResponse((await req.json()).messages || []);
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
