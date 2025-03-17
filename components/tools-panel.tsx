"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { History, BarChart2, User, Coins, Image, FileText, Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const tools: Tool[] = [
  {
    id: "get_transactions",
    name: "Get Transactions",
    description:
      "Retrieves recent transactions for a specified address, with an optional limit on the number of transactions.",
    icon: History,
  },
  {
    id: "get_stats",
    name: "Get Stats",
    description:
      "Fetches current blockchain statistics, including total blocks, average block time, total transactions, and more.",
    icon: BarChart2,
  },
  {
    id: "get_address_overview",
    name: "Address Overview",
    description: "Provides a comprehensive overview of an address, including balance and contract status.",
    icon: User,
  },
  {
    id: "get_token_holdings",
    name: "Token Holdings",
    description: "Lists all ERC-20 token holdings for a specified address, including detailed token information.",
    icon: Coins,
  },
  {
    id: "get_nft_holdings",
    name: "NFT Holdings",
    description: "Retrieves all NFT holdings for a given address, including collection information and metadata.",
    icon: Image,
  },
  {
    id: "interpret_transaction",
    name: "Interpret Transaction",
    description: "Provides a human-readable interpretation of a blockchain transaction based on its hash.",
    icon: FileText,
  },
]

export function ToolsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Handle click outside to close the panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        panelRef.current && 
        buttonRef.current && 
        !panelRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
        aria-label={isOpen ? "Close tools panel" : "Show available tools"}
      >
        {isOpen ? <X size={16} /> : <Info size={16} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 z-50 w-80 bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-800/50"
          >
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-[var(--font-space-grotesk),_var(--font-ibm-plex-mono),_sans-serif] text-white">
                Available Tools
              </h3>
              <p className="text-xs text-gray-400 mt-1">Hover over a tool to see its description</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="relative"
                  onMouseEnter={() => setActiveToolId(tool.id)}
                  onMouseLeave={() => setActiveToolId(null)}
                >
                  <div className="flex flex-col items-center justify-center h-[100px] w-full p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <tool.icon className="w-6 h-6 text-purple-400 mb-2" />
                    <span className="text-sm text-white text-center leading-tight">{tool.name}</span>
                  </div>

                  <AnimatePresence>
                    {activeToolId === tool.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-0 right-0 bottom-full mb-2 z-[9999]"
                      >
                        <div
                          className="relative bg-gray-900/95 backdrop-blur-md rounded-lg border border-gray-800 shadow-lg p-3 overflow-hidden"
                          style={{ borderRadius: "0.75rem" }}
                        >
                          <div className="text-xs text-gray-300">{tool.description}</div>
                          <div className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-gray-900 border-r border-b border-gray-800" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800 bg-gray-900/40">
              <p className="text-xs text-center text-gray-400">Type the tool name in chat to use it</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

