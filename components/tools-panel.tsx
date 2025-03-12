"use client"

import type React from "react"
import { useState } from "react"
import { Wallet, History, BarChart2, User, Coins, Image, FileText, Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ElementType
}

const tools: Tool[] = [
  {
    id: "check_balance",
    name: "Check Balance",
    description: "Checks the balance of a given address on the blockchain.",
    icon: Wallet,
  },
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

  return (
    <div className="relative">
      {/* Toggle Button - Now part of the header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
        aria-label={isOpen ? "Close tools panel" : "Show available tools"}
      >
        {isOpen ? <X size={16} /> : <Info size={16} />}
      </button>

      {/* Tools Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 z-50 w-80 bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50"
          >
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-['Acronym',_var(--font-ibm-plex-mono),_sans-serif] text-white">
                Available Tools
              </h3>
              <p className="text-xs text-gray-400 mt-1">Hover over a tool to see its description</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="relative group"
                  onMouseEnter={() => setActiveToolId(tool.id)}
                  onMouseLeave={() => setActiveToolId(null)}
                >
                  <div className="flex flex-col items-center justify-center h-[100px] w-full p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <tool.icon className="w-6 h-6 text-purple-400 mb-2" />
                    <span className="text-sm text-white text-center leading-tight">{tool.name}</span>
                  </div>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {activeToolId === tool.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className={`absolute z-10 w-full ${
                          // Adjust tooltip position based on the tool's position in the grid
                          tools.indexOf(tool) < 2 ? "top-[110%]" : "bottom-[110%]"
                        } left-0 p-3 bg-gray-900/95 backdrop-blur-md rounded-lg border border-gray-800 shadow-lg`}
                      >
                        <div className="text-xs text-gray-300">{tool.description}</div>
                        <div
                          className={`absolute ${
                            tools.indexOf(tool) < 2 ? "top-0" : "bottom-0"
                          } left-1/2 transform -translate-x-1/2 ${
                            tools.indexOf(tool) < 2 ? "-translate-y-1/2" : "translate-y-1/2"
                          } rotate-45 w-2 h-2 bg-gray-900 ${
                            tools.indexOf(tool) < 2 ? "border-l border-t" : "border-r border-b"
                          } border-gray-800`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800 bg-gray-900/40">
              <p className="text-xs text-center text-gray-400">Agent has access to these tools</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

