// Simple utility to manage conversation IDs
import { v4 as uuidv4 } from 'uuid';

// For server-side usage (in API routes)
export function getConversationId(): string {
  // When running on the server, just generate a new UUID each time
  // This is fine because the frontend will maintain its own conversation ID
  return uuidv4();
}

// For client-side usage
export function getClientConversationId(): string {
  if (typeof window === 'undefined') {
    return "2"; // Use "2" for fresh testing
  }
  
  // For testing purposes, always return "2" (fresh start)
  return "2";
}

// Reset the conversation (for starting a new chat)
export function resetConversation(): string {
  if (typeof window === 'undefined') {
    return "2"; // Use "2" for fresh testing
  }
  
  // For testing purposes, always return "2" (fresh start)
  return "2";
} 