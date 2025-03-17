"use client"

import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from "react"
import { useAccount, useWalletClient } from "wagmi"
import { StoryClient, StoryConfig, aeneid } from "@story-protocol/core-sdk"
import { custom } from "viem"

// Define the context type
type StoryContextType = {
  storyClient: StoryClient | null
  isReady: boolean
}

// Create the context with a default value
const StoryContext = createContext<StoryContextType>({
  storyClient: null,
  isReady: false,
})

// Export the hook for consuming the context
export const useStory = () => useContext(StoryContext)

// Provider component
export function StoryProvider({ children }: PropsWithChildren) {
  const [storyClient, setStoryClient] = useState<StoryClient | null>(null)
  const [isReady, setIsReady] = useState(false)
  
  const { isConnected, address } = useAccount()
  const { data: walletClient } = useWalletClient()

  useEffect(() => {
    const setupStoryClient = async () => {
      try {
        if (isConnected && walletClient && address) {
          // Setup Story Client
          const config: StoryConfig = {
            wallet: walletClient,
            transport: custom(walletClient.transport),
            chainId: "aeneid",
          }
          
          const client = StoryClient.newClient(config)
          setStoryClient(client)
          setIsReady(true)
          console.log("Story client initialized successfully")
        } else {
          setStoryClient(null)
          setIsReady(false)
        }
      } catch (error) {
        console.error("Error setting up Story client:", error)
        setStoryClient(null)
        setIsReady(false)
      }
    }

    setupStoryClient()
  }, [isConnected, walletClient, address])

  return (
    <StoryContext.Provider value={{ storyClient, isReady }}>
      {children}
    </StoryContext.Provider>
  )
} 