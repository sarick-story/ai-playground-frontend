"use client"

import { useState, useEffect } from "react"
import { Wallet } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useWalletClient } from "wagmi"
import { aeneid } from "@story-protocol/core-sdk"

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  // Client-side only rendering to prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show a simple button while loading to prevent hydration errors
  if (!mounted) {
    return (
      <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white backdrop-blur-sm">
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </button>
    )
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted: rainbowMounted,
      }) => {
        const ready = mounted && rainbowMounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white backdrop-blur-sm hover:from-purple-600/90 hover:to-pink-600/90 transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                  </button>
                )
              }

              if (chain.unsupported || chain.id !== aeneid.id) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/90 text-white backdrop-blur-sm hover:bg-red-600/90 transition-all shadow-lg"
                  >
                    <span>Wrong Network</span>
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 transition-all border border-gray-700/50 shadow-lg"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    <span className="text-xs text-white">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 transition-all border border-gray-700/50 shadow-lg"
                  >
                    <span className="text-xs text-white">
                      {account.displayName}
                      {/* Display ENS name if available or truncated address */}
                    </span>
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

// Add TypeScript interface for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

