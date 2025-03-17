"use client"

import { useState, useRef, useEffect } from "react"
import { Check, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface MCPServer {
  id: string
  name: string
  description: string
  available: boolean
  comingSoon?: boolean
}

interface MCPServerSelectorProps {
  servers: MCPServer[]
  selectedServerId: string
  onServerSelect: (serverId: string) => void
}

export function MCPServerSelector({ servers, selectedServerId, onServerSelect }: MCPServerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedServer = servers.find((server) => server.id === selectedServerId) || servers[0]

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        dropdownRef.current && 
        buttonRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
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
    <div className="relative w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-xl hover:border-purple-500/50 transition-all duration-200"
      >
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          <span className="text-white">{selectedServer.name}</span>
        </div>
        <div className="flex items-center text-gray-400">
          <span className="text-xs mr-2">Change</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-black/90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-800/50 overflow-hidden"
          >
            <div className="p-3 border-b border-gray-800">
              <h3 className="text-sm font-medium text-white">Select MCP Server</h3>
              <p className="text-xs text-gray-400 mt-1">Choose which MCP server to connect to</p>
            </div>
            <div className="p-2">
              {servers.map((server) => (
                <div
                  key={server.id}
                  onClick={() => {
                    if (server.available) {
                      onServerSelect(server.id)
                      setIsOpen(false)
                    }
                  }}
                  className={`flex items-start p-3 rounded-lg mb-2 last:mb-0 transition-colors duration-200 ${
                    server.available
                      ? "cursor-pointer hover:bg-gray-800/60"
                      : "opacity-60 cursor-not-allowed bg-gray-900/40"
                  } ${selectedServerId === server.id ? "bg-gray-800/60 border border-purple-500/50" : ""}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-white">{server.name}</h4>
                      {server.comingSoon && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{server.description}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {selectedServerId === server.id ? (
                      <Check className="w-5 h-5 text-purple-500" />
                    ) : server.comingSoon ? (
                      <AlertCircle className="w-5 h-5 text-gray-500" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

