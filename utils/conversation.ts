// Conversation ID management for proper checkpointer continuity
import { v4 as uuidv4 } from 'uuid';

const CONVERSATION_ID_KEY = 'story_conversation_id';

// For server-side usage (in API routes)
export function getConversationId(): string {
  // When running on the server, just generate a new UUID each time
  // This is fine because the frontend will maintain its own conversation ID
  return uuidv4();
}

// For client-side usage - maintains persistent conversation ID
export function getClientConversationId(): string {
  if (typeof window === 'undefined') {
    return uuidv4(); // Server-side fallback
  }
  
  // Get existing conversation ID from localStorage or create new one
  let conversationId = localStorage.getItem(CONVERSATION_ID_KEY);
  if (!conversationId) {
    conversationId = uuidv4();
    localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
  }
  
  return conversationId;
}

// Set a specific conversation ID (used when backend provides one)
export function setClientConversationId(conversationId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
  }
}

// Reset the conversation (for starting a new chat)
export function resetConversation(): string {
  if (typeof window === 'undefined') {
    return uuidv4(); // Server-side fallback
  }
  
  // Generate new conversation ID and store it
  const newConversationId = uuidv4();
  localStorage.setItem(CONVERSATION_ID_KEY, newConversationId);
  return newConversationId;
} 