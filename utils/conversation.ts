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
    return uuidv4(); // Fallback for SSR
  }
  
  const storedId = localStorage.getItem('conversationId');
  if (storedId) {
    return storedId;
  }
  
  const newId = uuidv4();
  localStorage.setItem('conversationId', newId);
  return newId;
}

// Reset the conversation (for starting a new chat)
export function resetConversation(): string {
  if (typeof window === 'undefined') {
    return uuidv4(); // Fallback for SSR
  }
  
  const newId = uuidv4();
  localStorage.setItem('conversationId', newId);
  return newId;
} 