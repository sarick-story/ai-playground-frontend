"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { format } from "date-fns"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

export function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    try {
      const response = await fetch(`${process.env.STORYSCAN_API_ENDPOINT}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      }).catch(() => {
        return new Response(
          JSON.stringify({
            message: "Thanks for your message! This is a demo response.",
          }),
        )
      })

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message || "Thanks for your message! This is a demo response.",
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Error sending message:", error)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I couldn't process your request. Please try again later.",
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    }
  }

  return (
    <div className="w-full max-w-md mx-auto h-[600px] flex flex-col bg-white rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">Chat App</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            {message.sender === "bot" && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                <span className="text-sm font-medium">B</span>
              </div>
            )}

            <div
              className={`rounded-lg p-3 max-w-[80%] ${
                message.sender === "user" ? "bg-black text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              <p>{message.content}</p>
              <p className="text-xs opacity-70 mt-1">{format(message.timestamp, "hh:mm a")}</p>
            </div>

            {message.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center ml-2">
                <span className="text-sm font-medium">U</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            className="p-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

