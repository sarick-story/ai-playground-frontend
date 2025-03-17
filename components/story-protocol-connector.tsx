"use client"

import { useState, useEffect } from "react"
import { ConnectWalletButton } from "./connect-wallet-button"
import { useAccount, useSwitchChain } from "wagmi"
import { aeneid } from "@story-protocol/core-sdk"
import { useStory } from "@/lib/context/StoryContext"

type StoryProtocolConnectorProps = {
  onConnected?: () => void
}

export function StoryProtocolConnector({ onConnected }: StoryProtocolConnectorProps) {
  const [mounted, setMounted] = useState(false)
  const { isConnected, chainId } = useAccount()
  const { storyClient, isReady } = useStory()
  const { switchChain } = useSwitchChain()

  // Client-side only rendering to prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isReady && storyClient && onConnected) {
      onConnected()
    }
  }, [isReady, storyClient, onConnected])

  // Show nothing until client-side rendering is ready
  if (!mounted) return null

  // Not connected to any wallet
  if (!isConnected) {
    return (
      <div className="bg-black/80 backdrop-blur-sm p-6 rounded-lg border border-gray-800 shadow-xl max-w-md mx-auto">
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
          <p className="text-gray-300 text-sm text-center mb-4">
            To use Story Protocol features, you need to connect your wallet to the Aeneid testnet.
          </p>
          <ConnectWalletButton />
        </div>
      </div>
    )
  }

  // Connected but wrong network
  if (chainId !== aeneid.id) {
    return (
      <div className="bg-black/80 backdrop-blur-sm p-6 rounded-lg border border-gray-800 shadow-xl max-w-md mx-auto">
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-xl font-semibold text-white mb-2">Switch Network</h2>
          <p className="text-gray-300 text-sm text-center mb-4">
            Please switch to the Story Protocol Aeneid testnet to continue.
          </p>
          <button
            onClick={() => switchChain({ chainId: aeneid.id })}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white backdrop-blur-sm hover:from-purple-600/90 hover:to-pink-600/90 transition-all"
          >
            Switch to Aeneid Testnet
          </button>
        </div>
      </div>
    )
  }

  // Connected and right network, but client not ready
  if (!isReady || !storyClient) {
    return (
      <div className="bg-black/80 backdrop-blur-sm p-6 rounded-lg border border-gray-800 shadow-xl max-w-md mx-auto">
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-xl font-semibold text-white mb-2">Initializing</h2>
          <p className="text-gray-300 text-sm text-center mb-4">
            Setting up Story Protocol client...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    )
  }

  // Everything ready
  return null
} 