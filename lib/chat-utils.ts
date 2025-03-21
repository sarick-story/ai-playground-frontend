/**
 * Utility functions for chat and transaction handling
 */

import { Address } from 'viem';
import { type Message } from 'ai'

/**
 * Utilities for chat message processing
 */

// Interface for transaction intent
export interface TransactionIntent {
  to: string;
  amount: string;
  data?: string;
}

/**
 * Validates an Ethereum address
 * @param address The address to validate
 * @returns Whether the address is valid
 */
export function isValidEthereumAddress(address: string): boolean {
  // Check if it's a string and starts with 0x
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    return false;
  }
  
  // Check if it's the right length (42 characters = 0x + 40 hex chars)
  if (address.length !== 42) {
    return false;
  }
  
  // Check if it contains only valid hex characters
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Formats an Ethereum address for display
 * @param address The address to format
 * @returns Formatted address (e.g. 0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (!isValidEthereumAddress(address)) {
    return address;
  }
  
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Creates a transaction intent object that the frontend can process
 * @param to Recipient address
 * @param amount Amount in ETH/IP
 * @param data Optional transaction data
 * @returns Formatted transaction intent string for the message
 */
export function createTransactionIntent(to: string, amount: string, data: string = '0x'): string {
  const intentObject = {
    to,
    amount,
    data
  };
  
  return `Transaction intent: \n\`\`\`json\n${JSON.stringify(intentObject, null, 2)}\n\`\`\``;
}

/**
 * Extracts transaction intent from message content
 * @param content The message content 
 * @returns Transaction intent object if found, null otherwise
 */
export function extractTransactionIntent(content: string): TransactionIntent | null {
  // Look for transaction intent format in the message
  const transactionMatch = content.match(/Transaction intent:\s*```json\s*({.*?})\s*```/s);
  
  if (!transactionMatch || !transactionMatch[1]) {
    return null;
  }
  
  try {
    const intentData = JSON.parse(transactionMatch[1]);
    
    // Validate required fields
    if (!intentData.to || !intentData.amount) {
      console.error('Invalid transaction intent: Missing required fields');
      return null;
    }
    
    // Validate address format
    if (!isValidEthereumAddress(intentData.to)) {
      console.error('Invalid transaction intent: Invalid address format');
      return null;
    }
    
    return {
      to: intentData.to,
      amount: intentData.amount,
      data: intentData.data || '0x'
    };
  } catch (e) {
    console.error('Error parsing transaction intent:', e);
    return null;
  }
}

/**
 * Checks if a message contains a transaction intent
 * @param message The message to check
 * @returns Whether the message contains a transaction intent
 */
export function hasTransactionIntent(message: Message): boolean {
  return message.content.includes('Transaction intent:');
} 