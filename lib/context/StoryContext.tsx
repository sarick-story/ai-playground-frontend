"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAccount } from 'wagmi';

// Define the context type
type StoryContextType = {
  walletAddress: string | undefined;
  isWalletConnected: boolean;
  transactionInProgress: boolean;
  setTransactionInProgress: (inProgress: boolean) => void;
  lastTransactionHash: string | null;
  setLastTransactionHash: (hash: string | null) => void;
};

// Create context with default values
const StoryContext = createContext<StoryContextType>({
  walletAddress: undefined,
  isWalletConnected: false,
  transactionInProgress: false,
  setTransactionInProgress: () => {},
  lastTransactionHash: null,
  setLastTransactionHash: () => {},
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
  
  // Context value
  const value = {
    walletAddress: address,
    isWalletConnected: isConnected,
    transactionInProgress,
    setTransactionInProgress,
    lastTransactionHash,
    setLastTransactionHash,
  };
  
  return (
    <StoryContext.Provider value={value}>
      {children}
    </StoryContext.Provider>
  );
}; 