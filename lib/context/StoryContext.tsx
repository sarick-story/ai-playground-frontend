"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Define the context type
type StoryContextType = {
  walletAddress: string | undefined;
  isWalletConnected: boolean;
  transactionInProgress: boolean;
  setTransactionInProgress: (inProgress: boolean) => void;
  lastTransactionHash: string | null;
  setLastTransactionHash: (hash: string | null) => void;
  storyClient: any | null;
  isReady: boolean;
};

// Create context with default values
const StoryContext = createContext<StoryContextType>({
  walletAddress: undefined,
  isWalletConnected: false,
  transactionInProgress: false,
  setTransactionInProgress: () => {},
  lastTransactionHash: null,
  setLastTransactionHash: () => {},
  storyClient: null,
  isReady: false,
});

// Hook to use the Story context
export const useStory = () => useContext(StoryContext);

// Provider component
export const StoryProvider = ({ children }: { children: ReactNode }) => {
  // Use wagmi hooks for wallet state
  const { address, isConnected } = useAccount();
  
  // Transaction state
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [lastTransactionHash, setLastTransactionHash] = useState<string | null>(null);
  const [storyClient, setStoryClient] = useState<any | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Initialize Story client when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      // For now, we'll just set isReady to true when wallet is connected
      // In a real implementation, you would initialize the actual client here
      setIsReady(true);
    } else {
      setIsReady(false);
      setStoryClient(null);
    }
  }, [isConnected, address]);
  
  // Context value
  const value = {
    walletAddress: address,
    isWalletConnected: isConnected,
    transactionInProgress,
    setTransactionInProgress,
    lastTransactionHash,
    setLastTransactionHash,
    storyClient,
    isReady,
  };
  
  return (
    <StoryContext.Provider value={value}>
      {children}
    </StoryContext.Provider>
  );
}; 