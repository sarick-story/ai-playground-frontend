"use client";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { ArrowRight } from "lucide-react";
import { TransactionTable } from "@/components/transaction-table";
import { StatsPanel } from "@/components/stats-panel";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown, { Components } from "react-markdown";
import { ToolsPanel } from "@/components/tools-panel";
import { MCPServerSelector, type MCPServer } from "@/components/mcp-server-selector";
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useAccount, useWalletClient } from "wagmi";
import { parseEther } from 'viem';
import { getClientConversationId, resetConversation, setClientConversationId } from '@/utils/conversation';

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

// Define available MCP servers
const MCP_SERVERS: MCPServer[] = [
  {
    id: "storyscan",
    name: "Storyscan MCP",
    description: "The official Storyscan Model Context Protocol server",
    available: true,
  },
  {
    id: "sdk",
    name: "Story SDK MCP",
    description: "Advanced MCP server with SDK integration capabilities",
    available: true,
    requiresWallet: true,
  },
]

// Define props interface for the memoized markdown component
interface MemoizedMarkdownProps {
  content: string
  components: Components
}

// Create a memoized markdown component to prevent unnecessary re-renders
const MemoizedMarkdown = memo(
  ({content, components}: MemoizedMarkdownProps) => (
    <div className='markdown-tight w-full'>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {content}
      </ReactMarkdown>
    </div>
  ),
  (prevProps: MemoizedMarkdownProps, nextProps: MemoizedMarkdownProps) =>
    prevProps.content === nextProps.content
)

// Set display name for React DevTools
MemoizedMarkdown.displayName = "MemoizedMarkdown";

// Create a TimestampDisplay component for client-side only rendering
const TimestampDisplay = memo(({ timestamp }: { timestamp: Date }) => {
  const [formattedTime, setFormattedTime] = useState<string>("");
  
  useEffect(() => {
    // Format the timestamp only on the client side
    setFormattedTime(timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }));
  }, [timestamp]);
  
  // Don't render anything until formattedTime is set (client-side only)
  if (!formattedTime) return null;
  
  return <p className="text-xs opacity-70 mt-1">{formattedTime}</p>;
});

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [program, setProgram] = useState<WebGLProgram | null>(null)
  const [time, setTime] = useState(0)
  const [mouseX, setMouseX] = useState(0.5)
  const [mouseY, setMouseY] = useState(0.5)
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null)
  const [timeLocation, setTimeLocation] = useState<WebGLUniformLocation | null>(
    null
  )
  const [mouseLocation, setMouseLocation] =
    useState<WebGLUniformLocation | null>(null)
  const [resolutionLocation, setResolutionLocation] =
    useState<WebGLUniformLocation | null>(null);
  const [selectedMCPServerId, setSelectedMCPServerId] = useState<string>("storyscan");
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [showSignModal, setShowSignModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>("");
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [currentInterrupt, setCurrentInterrupt] = useState<any>(null);
  const [pendingConversationId, setPendingConversationId] = useState<string>("");
  const [isInterruptProcessing, setIsInterruptProcessing] = useState(false);
  // Maintain persistent conversation ID for checkpointer continuity
  const [conversationId, setConversationId] = useState<string>("");
  // Track interrupts we've already handled to prevent duplicate popups
  const handledInterruptIdsRef = useRef<Set<string>>(new Set());
  // Track which AI message IDs have already been processed to avoid duplicates
  const processedAiMessageIds = useRef<Set<string>>(new Set());

  // Initialize conversation ID on mount
  useEffect(() => {
    const id = getClientConversationId();
    setConversationId(id);
    console.log("Initialized conversation ID:", id);
  }, []);

  // Use Vercel AI SDK for chat
  useEffect(() => {
    if (address) {
      console.log("Connected wallet address:", address);
    } else {
      console.log("No wallet connected");
    }
  }, [address]);

  const {
    messages: aiMessages,
    input: aiInput,
    handleInputChange,
    handleSubmit,
    status,
    // isLoading,
    setMessages: setAiMessages,
    reload,
  } = useChat({
    api: "/api/chat",
    body: {
      mcp_type: selectedMCPServerId,
      wallet_address: isConnected ? address : undefined,
      conversation_id: conversationId || undefined
    },
    id: `chat-${selectedMCPServerId}-${address || 'no-wallet'}`,
    streamProtocol: 'text', // Use raw text protocol for compatibility with the backend
    onFinish: (message) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Chat finished with message:", message.content);
      }
    },
    onResponse: async (response) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Got response from backend");
      }
      
      // Check response content type to determine if it's a transaction or regular response
      const contentType = response.headers.get('content-type');
      
      // Handle JSON responses (transaction intents)
      if (contentType && contentType.includes('application/json')) {
        console.log("Received JSON response, processing as transaction");
        try {
          const jsonData = await response.clone().json();
          if (jsonData.is_transaction) {
            console.log("Transaction detected:", jsonData);
            
            // Call transaction endpoint to format the transaction for wagmi
            fetch("/api/transaction", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to_address: jsonData.transaction_details.to_address,
                amount: jsonData.transaction_details.amount,
                wallet_address: jsonData.transaction_details.wallet_address,
                ...(privateKey && { private_key: privateKey })
              }),
            })
            .then(response => {
              if (!response.ok) {
                return response.text().then(text => {
                  throw new Error(`Transaction API error: ${response.status} - ${text}`);
                });
              }
              return response.json();
            })
            .then(formattedTxData => {
              // Format for wagmi
              const wagmiTxData = {
                transaction: {
                  to: formattedTxData.transaction.to,
                  value: parseEther(formattedTxData.transaction.value),
                  data: formattedTxData.transaction.data || '0x',
                  gas: formattedTxData.transaction.gas,
                },
                message: formattedTxData.message
              };
              
              // Set transaction data and show modal
              setPendingTransaction(wagmiTxData);
              setShowSignModal(true);
              
              // Add transaction message to chat
              setMessages(prev => [...prev, {
                id: `tx-success-${Date.now()}`,
                content: jsonData.message,
                sender: "bot",
                timestamp: new Date(),
              }]);
            })
            .catch(error => {
              console.error("Error processing transaction:", error);
              setMessages(prev => [...prev, {
                id: `tx-error-${Date.now()}`,
                content: `❌ Error preparing transaction: ${error.message}`,
                sender: "bot",
                timestamp: new Date(),
              }]);
            });
            
            // Prevent the default Vercel AI SDK handling since we're handling this JSON response manually
            throw new Error("IGNORE_STREAM_RESPONSE");
          }
        } catch (error: any) {
          if (error.message === "IGNORE_STREAM_RESPONSE") {
            // This is our custom control flow, not an actual error
            console.log("Skipping stream handling for JSON response");
          } else {
            console.error("Error parsing response as JSON:", error);
          }
        }
      }
      
      // Non-JSON responses continue with normal stream handling
      if (!response.ok) {
        console.error("Response error:", response.status, response.statusText)
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      
      // Handle special Vercel AI SDK errors that might be from JSON responses
      if (error.message?.includes("Failed to parse stream")) {
        console.log("Stream parse error detected - this might be a transaction response");
        
        // Make a direct API call to get the JSON data
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{role: "user", content: aiInput}],
            mcp_type: selectedMCPServerId,
            wallet_address: address
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.is_transaction) {
            // Process transaction directly
            fetch("/api/transaction", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to_address: data.transaction_details.to_address,
                amount: data.transaction_details.amount,
                wallet_address: data.transaction_details.wallet_address,
                ...(privateKey && { private_key: privateKey })
              }),
            })
            .then(response => response.json())
            .then(txData => {
              const wagmiTxData = {
                transaction: {
                  to: txData.transaction.to,
                  value: parseEther(txData.transaction.value),
                  data: txData.transaction.data || '0x',
                  gas: txData.transaction.gas
                },
                message: txData.message
              };
              
              setPendingTransaction(wagmiTxData);
              setShowSignModal(true);
              
              setMessages(prev => [...prev, {
                id: `tx-error-response-${Date.now()}`,
                content: data.message,
                sender: "bot",
                timestamp: new Date(),
              }]);
            })
            .catch(err => {
              console.error("Transaction processing error:", err);
              setMessages(prev => [...prev, {
                id: `tx-processing-error-${Date.now()}`,
                content: `❌ Error preparing transaction: ${err.message}`,
                sender: "bot", 
                timestamp: new Date(),
              }]);
            });
          }
        })
        .catch(err => {
          console.error("Failed to get direct API data:", err);
        });
      }
    },
  })
  const isLoading = status === "submitted"

  // Function to set input value for ToolsPanel
  const setInputValue = (value: string) => {
    // Create a synthetic event to pass to handleInputChange
    const syntheticEvent = {
      target: { value }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(syntheticEvent);
  };

  // Function to detect and handle interrupt messages
  const detectInterruptMessage = (content: string) => {
    const interruptMatch = content.match(/__INTERRUPT_START__([\s\S]+?)__INTERRUPT_END__/);
    if (interruptMatch && interruptMatch[1]) {
      try {
        const interruptData = JSON.parse(interruptMatch[1]);
        console.log("Interrupt detected:", interruptData);
        
        // Deduplicate: if we've already handled this interrupt_id, do not show again
        const interruptId: string | undefined = interruptData?.interrupt_id;
        const cleanedContent = content.replace(/__INTERRUPT_START__[\s\S]+?__INTERRUPT_END__/, '').trim();
        if (interruptId && handledInterruptIdsRef.current.has(interruptId)) {
          console.log("Interrupt already handled, skipping modal:", interruptId);
          return cleanedContent;
        }
        if (interruptId) {
          handledInterruptIdsRef.current.add(interruptId);
        }

        // Store interrupt data and show confirmation modal (only once per id)
        setCurrentInterrupt(interruptData);
        setShowInterruptModal(true);
        
        // Always use conversation_id from backend (UUID) and persist it
        if (interruptData.conversation_id) {
          setPendingConversationId(interruptData.conversation_id);
          setConversationId(interruptData.conversation_id);
          setClientConversationId(interruptData.conversation_id);
          console.log("Updated persistent conversation ID:", interruptData.conversation_id);
        } else {
          console.error("No conversation_id received from backend in interrupt data!");
        }
        
        // Return cleaned content without interrupt markers
        return cleanedContent;
      } catch (e) {
        console.error("Failed to parse interrupt data:", e);
      }
    }
    return content;
  };

  // Incremental AI message processing - only add NEW messages
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("AI Messages updated", aiMessages);
      
      // Log message content for debugging
      if (aiMessages.length > 0) {
        const latestMessage = aiMessages[aiMessages.length - 1];
        console.log("Latest AI message content:", latestMessage.content);
        
        // Check for interrupt in the latest message
        if (latestMessage.content.includes('__INTERRUPT_START__')) {
          console.log("Interrupt pattern found in message");
        }
      }
    }
    
    // Find NEW AI messages that haven't been processed yet
    const newAiMessages = aiMessages.filter(msg => 
      !processedAiMessageIds.current.has(msg.id)
    );
    
    if (newAiMessages.length > 0) {
      // Convert new AI messages to Message format
      const newMessages = newAiMessages.map(msg => ({
        id: msg.id,
        content: detectInterruptMessage(msg.content), // Process interrupts
        sender: (msg.role === "user" ? "user" : "bot") as "user" | "bot",
        timestamp: new Date(), // Use actual timestamp when message was added
      }));

      // Add new messages to the END (preserves chronological order)
      setMessages(prev => [...prev, ...newMessages]);
      
      // Mark these messages as processed
      newAiMessages.forEach(msg => {
        processedAiMessageIds.current.add(msg.id);
      });
    }
  }, [aiMessages, selectedMCPServerId, address]);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const newGl = canvas.getContext("webgl")
    if (!newGl) return

    setGl(newGl)

    const vertexShader = newGl.createShader(newGl.VERTEX_SHADER)
    if (!vertexShader) return

    newGl.shaderSource(
      vertexShader,
      `
      attribute vec4 position;
      varying vec2 v_uv;
      void main() {
        v_uv = position.xy * 0.5 + 0.5;
        gl_Position = position;
      }
    `
    )
    newGl.compileShader(vertexShader)

    const fragmentShader = newGl.createShader(newGl.FRAGMENT_SHADER)
    if (!fragmentShader) return

    newGl.shaderSource(
      fragmentShader,
      `
      precision mediump float;

      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec2 u_resolution;
      varying vec2 v_uv;

      float hash(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
          );
      }

      float fbm(vec2 p) {
          float sum = 0.0;
          float amp = 0.5;
          float freq = 1.0;
          for(int i = 0; i < 6; i++) {
              sum += noise(p * freq) * amp;
              amp *= 0.5;
              freq *= 2.0;
          }
          return sum;
      }

      void main() {
          vec2 uv = v_uv;
          vec2 aspect = vec2(u_resolution.x/u_resolution.y, 1.0);
          uv *= aspect;
          
          float mouseInfluence = length(u_mouse * aspect - uv) * 2.0;
          mouseInfluence = 1.0 - smoothstep(0.0, 1.0, mouseInfluence);
          
          vec2 motion = vec2(u_time * 0.1, u_time * 0.05);
          float n1 = fbm(uv * 2.0 + motion);
          float n2 = fbm(uv * 3.0 - motion * 1.2);
          float n3 = fbm(uv * 1.5 + motion * 0.8);
          
          vec3 color1 = vec3(0.8, 0.2, 0.8);  // Purple
          vec3 color2 = vec3(0.0, 0.8, 0.8);  // Cyan
          vec3 color3 = vec3(1.0, 0.4, 0.4);  // Pink
          
          float blend1 = sin(n1 * 3.14159 + u_time) * 0.5 + 0.5;
          float blend2 = cos(n2 * 3.14159 - u_time * 0.5) * 0.5 + 0.5;
          float blend3 = sin(n3 * 3.14159 + u_time * 0.7) * 0.5 + 0.5;
          
          vec3 finalColor = mix(color1, color2, blend1);
          finalColor = mix(finalColor, color3, blend2 * 0.5);
          
          float distortion = (n1 + n2 + n3) * 0.3;
          distortion += mouseInfluence * 0.2;
          
          finalColor += vec3(distortion) * 0.2;
          finalColor = mix(finalColor, vec3(1.0), distortion * 0.1);
          
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `
    )
    newGl.compileShader(fragmentShader)

    const newProgram = newGl.createProgram()
    if (!newProgram) return

    newGl.attachShader(newProgram, vertexShader)
    newGl.attachShader(newProgram, fragmentShader)
    newGl.linkProgram(newProgram)
    setProgram(newProgram)

    const positionBuffer = newGl.createBuffer()
    newGl.bindBuffer(newGl.ARRAY_BUFFER, positionBuffer)
    newGl.bufferData(
      newGl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      newGl.STATIC_DRAW
    )

    const positionLocation = newGl.getAttribLocation(newProgram, "position")
    newGl.enableVertexAttribArray(positionLocation)
    newGl.vertexAttribPointer(positionLocation, 2, newGl.FLOAT, false, 0, 0)

    const newTimeLocation = newGl.getUniformLocation(newProgram, "u_time")
    const newMouseLocation = newGl.getUniformLocation(newProgram, "u_mouse")
    const newResolutionLocation = newGl.getUniformLocation(
      newProgram,
      "u_resolution"
    )

    setTimeLocation(newTimeLocation)
    setMouseLocation(newMouseLocation)
    setResolutionLocation(newResolutionLocation)

    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX / window.innerWidth)
      setMouseY(1.0 - e.clientY / window.innerHeight)
    }

    window.addEventListener("mousemove", handleMouseMove)

    const startTime = Date.now()

    let animationFrameId: number

    const render = () => {
      if (
        !newGl ||
        !canvas ||
        !newProgram ||
        !newTimeLocation ||
        !newMouseLocation ||
        !newResolutionLocation
      )
        return

      newGl.viewport(0, 0, canvas.width, canvas.height)

      const currentTime = (Date.now() - startTime) / 1000
      setTime(currentTime)

      newGl.uniform1f(newTimeLocation, currentTime)
      newGl.uniform2f(newMouseLocation, mouseX, mouseY)
      newGl.uniform2f(newResolutionLocation, canvas.width, canvas.height)

      newGl.drawArrays(newGl.TRIANGLE_STRIP, 0, 4)
      animationFrameId = requestAnimationFrame(render)
    }

    newGl.useProgram(newProgram)

    const animate = () => {
      render()
    }

    animate()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrameId)
      if (gl && program) {
        gl.deleteProgram(program)
      }
    }
  }, [])

  useEffect(() => {
    if (
      !gl ||
      !program ||
      !timeLocation ||
      !mouseLocation ||
      !resolutionLocation
    )
      return

    if (!canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    gl.viewport(0, 0, canvas.width, canvas.height)

    //gl.useProgram(program) // Remove this line

    gl.uniform1f(timeLocation, time)
    gl.uniform2f(mouseLocation, mouseX, mouseY)
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
  }, [
    time,
    mouseX,
    mouseY,
    program,
    gl,
    timeLocation,
    mouseLocation,
    resolutionLocation,
  ])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add this after the existing useEffect for scrollToBottom
  useEffect(() => {
    // Save the current scroll position
    const scrollPosition = window.scrollY

    // After the component updates and scrolls to bottom
    return () => {
      // Restore the page scroll position
      window.scrollTo(0, scrollPosition)
    }
  }, [messages])

  // Replace the handleSendMessage function with one that uses the AI SDK
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiInput.trim()) return

    handleSubmit(e)
  }

  // Handle MCP server selection
  const handleMCPServerSelect = (serverId: string) => {
    if (serverId === selectedMCPServerId) return; // Don't update if same server
    
    setSelectedMCPServerId(serverId);
    
    // Reset conversation for new server
    const newConversationId = resetConversation();
    setConversationId(newConversationId);
    console.log("Reset conversation ID for new server:", newConversationId);
    
    // Reset the messages state for the UI
    const welcomeMessage: Message = {
      id: "welcome",
      content: "Hello! How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    
    // Reset the AI SDK messages
    setAiMessages([]);
    
    // Clear processed message tracking
    processedAiMessageIds.current.clear();
  };

  // Memoize the markdown components to prevent recreation on each render
  const markdownComponents = useMemo<Components>(
    () => ({
      p: ({...props}) => <p className='break-words my-0 w-full' {...props} />,
      pre: ({...props}) => (
        <pre
          className='break-words whitespace-pre-wrap bg-gray-900/50 p-1.5 rounded my-1 w-full'
          {...props}
        />
      ),
      code: ({...props}) => (
        <code
          className='break-words font-mono bg-gray-900/30 px-1 py-0.5 rounded'
          {...props}
        />
      ),
      ul: ({...props}) => <ul className='my-0.5 w-full' {...props} />,
      ol: ({...props}) => (
        <ol className='list-decimal pl-4 my-0.5 w-full' {...props} />
      ),
      li: ({...props}) => <li className='my-0 w-full' {...props} />,
      h1: ({...props}) => (
        <h1 className='text-xl font-bold my-0.5 w-full' {...props} />
      ),
      h2: ({...props}) => (
        <h2 className='text-lg font-bold my-0.5 w-full' {...props} />
      ),
      h3: ({...props}) => (
        <h3 className='text-base font-bold my-0.5 w-full' {...props} />
      ),
      // Add specific handling for line breaks
      br: ({...props}) => <br className='my-0' {...props} />,
      strong: ({...props}) => <strong className="font-bold" {...props} />
    }),
    []
  )

  // Add a useEffect to handle wallet disconnection
  useEffect(() => {
    // If wallet disconnected and SDK server is selected, reset to Storyscan
    if (!isConnected && selectedMCPServerId === "sdk") {
      setSelectedMCPServerId("storyscan");
      console.log("Wallet disconnected, reset to Storyscan MCP");
    }
  }, [isConnected, selectedMCPServerId]);

  // Process messages to extract transaction requests
  const processMessage = (message: string) => {
    try {
      // Check if the message contains a transaction request
      if (message.includes('Transaction request:')) {
        // Extract the JSON transaction request using a more compatible regex
        // Instead of the /s flag, use [\s\S]* to match across multiple lines
        const transactionMatch = message.match(/```json\s*([\s\S]*?)\s*```/);
        if (transactionMatch && transactionMatch[1]) {
          try {
            const txRequest = JSON.parse(transactionMatch[1]);
            console.log("Found transaction request:", txRequest);
            setPendingTransaction(txRequest);
            setShowSignModal(true);
          } catch (e) {
            console.error("Failed to parse transaction JSON:", e);
          }
        } else {
          console.log("Transaction marker found but couldn't extract JSON");
        }
      }
      return message;
    } catch (error) {
      console.error("Error processing message:", error);
      return message;
    }
  };

  // Handler for signing a transaction from the SDK MCP
  const handleSignTransaction = async () => {
    if (!pendingTransaction || !walletClient || !address) {
      console.error("Cannot sign transaction: Missing prerequisites", { 
        hasPendingTx: !!pendingTransaction,
        hasWalletClient: !!walletClient,
        hasAddress: !!address
      });
      return;
    }
    
    try {
      setTxStatus('processing');
      console.log("Transaction to sign:", pendingTransaction);
      
      // Ensure value is a proper hex string
      let { transaction } = pendingTransaction;
      
      // Log the transaction details for debugging
      const txValue = Number(BigInt(transaction.value)) / 1e18;
      console.log(`Attempting to send ${txValue} IP to ${transaction.to}`);
      
      // Make sure we have all required fields in proper format
      if (!transaction.to.startsWith('0x')) {
        transaction.to = '0x' + transaction.to;
      }
      
      // Ensure gas is a hex string
      if (typeof transaction.gas === 'string' && !transaction.gas.startsWith('0x')) {
        transaction.gas = '0x' + transaction.gas;
      } else if (typeof transaction.gas === 'number') {
        transaction.gas = '0x' + transaction.gas.toString(16);
      }
      
      // Ensure value is a hex string
      if (typeof transaction.value === 'string' && !transaction.value.startsWith('0x')) {
        transaction.value = '0x' + transaction.value;
      } else if (typeof transaction.value === 'number') {
        transaction.value = '0x' + transaction.value.toString(16);
      }
      
      console.log("Formatted transaction:", transaction);
      
      // Create a properly formatted transaction for wagmi
      const txParams = {
        to: transaction.to as `0x${string}`,
        value: BigInt(transaction.value),
        data: transaction.data as `0x${string}`,
      };
      
      console.log("Sending transaction with params:", txParams);
      
      // Sign and send the transaction - do NOT specify chain to use the connected chain
      const hash = await walletClient.sendTransaction(txParams);
      
      console.log("Transaction sent successfully:", hash);
      
      // Update the chat with transaction success
      setMessages(prev => [...prev, {
        id: `tx-success-${Date.now()}`,
        content: `✅ Transaction sent successfully! Transaction hash: ${hash}`,
        sender: "bot",
        timestamp: new Date(),
      }]);
      
      setTxStatus('success');
      setPendingTransaction(null);
      setShowSignModal(false);
    } catch (error) {
      console.error("Transaction error:", error);
      
      // Extract error message
      let errorMessage = "Transaction failed";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // Update the chat with transaction error
      setMessages(prev => [...prev, {
        id: `tx-failure-${Date.now()}`,
        content: `❌ Transaction failed: ${errorMessage}`,
        sender: "bot",
        timestamp: new Date(),
      }]);
      
      setTxStatus('error');
      setPendingTransaction(null);
      setShowSignModal(false);
    }
  };

  // Update effect to log wallet address changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && address) {
      console.log("Wallet address:", address);
    }
  }, [address]);

  // Add debugging for wallet connection and transaction state
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;
    
    // Log connection status
    console.log("Wallet connection status:", { 
      isConnected, 
      address,
      hasWalletClient: !!walletClient
    });
    
    // Log transaction state whenever it changes
    if (pendingTransaction) {
      console.log("Transaction pending:", pendingTransaction);
      console.log("Transaction value in ETH:", Number(BigInt(pendingTransaction.transaction.value)) / 1e18);
    }
  }, [isConnected, address, walletClient, pendingTransaction]);

  // Handler for interrupt confirmation/rejection
  const handleInterruptConfirmation = async (confirmed: boolean) => {
    if (!currentInterrupt || !pendingConversationId) {
      console.error("No current interrupt to handle");
      return;
    }

    // Prevent multiple simultaneous operations
    if (isInterruptProcessing) {
      console.log("Interrupt confirmation already in progress, ignoring");
      return;
    }

    try {
      setIsInterruptProcessing(true);
      console.log(`Sending interrupt ${confirmed ? 'confirmation' : 'rejection'}:`, {
        interrupt_id: currentInterrupt.interrupt_id,
        conversation_id: pendingConversationId,
        confirmed
      });

      const response = await fetch('/api/interrupt/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interrupt_id: currentInterrupt.interrupt_id,
          conversation_id: pendingConversationId,
          confirmed,
          wallet_address: address
        })
      });

      if (!response.ok) {
        throw new Error(`Interrupt confirmation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Interrupt confirmation result:', result);

      // Close the modal
      setShowInterruptModal(false);
      setCurrentInterrupt(null);
      setPendingConversationId("");
      setIsInterruptProcessing(false);

      // Use proper functional updates to prevent race conditions
      const statusMessage = confirmed 
        ? "✅ Operation confirmed, continuing..."
        : "❌ Operation cancelled by user";
      
      const statusMessageId = `interrupt-status-${Date.now()}`;
      
      // Add status message ONLY to aiMessages - useEffect will handle display automatically
      setAiMessages(prev => [...prev, {
        id: statusMessageId,
        role: "assistant", 
        content: statusMessage,
      }]);

      // Add AI response message ONLY to aiMessages - useEffect will handle display automatically
      if (result.status === 'completed' && result.message) {
        const messageId = `interrupt-resume-${Date.now()}`;
        
        // Add ONLY to aiMessages state - useEffect will handle UI display and prevent duplicates
        setAiMessages(prev => [...prev, {
          id: messageId,
          role: "assistant",
          content: result.message,
        }]);
      } else if (result.status === 'cancelled' && result.message) {
        const messageId = `interrupt-cancel-${Date.now()}`;
        
        // Add ONLY to aiMessages state - useEffect will handle UI display and prevent duplicates  
        setAiMessages(prev => [...prev, {
          id: messageId,
          role: "assistant",
          content: result.message,
        }]);
      }

    } catch (error) {
      console.error('Error handling interrupt confirmation:', error);
      const errorMessageId = `interrupt-error-${Date.now()}`;
      const errorContent = `❌ Error handling confirmation: ${error}`;
      
      // Add error message ONLY to aiMessages - useEffect will handle display automatically
      setAiMessages(prev => [...prev, {
        id: errorMessageId,
        role: "assistant",
        content: errorContent,
      }]);
      
      // Still close the modal even on error
      setShowInterruptModal(false);
      setCurrentInterrupt(null);
      setPendingConversationId("");
      setIsInterruptProcessing(false);
    }
  };

  // Track when the sign modal becomes visible
  useEffect(() => {
    if (showSignModal) {
      console.log("Transaction sign modal is now VISIBLE");
      
      // Force focus on the Sign Transaction button for better visibility
      const signButton = document.querySelector("[data-sign-tx-button]");
      if (signButton) {
        (signButton as HTMLButtonElement).focus();
      }
    } else {
      console.log("Transaction sign modal is now HIDDEN");
    }
  }, [showSignModal]);

  // Track when the interrupt modal becomes visible
  useEffect(() => {
    if (showInterruptModal) {
      console.log("Interrupt confirmation modal is now VISIBLE");
    } else {
      console.log("Interrupt confirmation modal is now HIDDEN");
    }
  }, [showInterruptModal]);

  return (
    <>
      <canvas ref={canvasRef} className='fixed inset-0 -z-10' />
      <main className='main-container pt-8'>
        <div className='flex justify-center mb-8'>
          <svg
            className='h-16 w-auto text-white'
            viewBox='0 0 398.4 91.4'
            fill='currentColor'
          >
            <path d='M352.2,89.7h18.4V52.8l27.7-50.2h-21.2l-24.9,46.5V89.7z' />
            <path d='M357.4,40.9L336.6,2.6h-20.9l20.9,38.3H357.4z' />
            <path d='M286.3,62.6l14.1,27.1h20l-17.6-32c8.1-5.6,12.9-14.6,12.9-24.9c0-16.8-10.5-30.1-33.1-30.1h-36.2v87.1h19.1V62.8 L286.3,62.6z M265.5,18.7h17.2c9.3,0,14.8,4.9,14.8,13.8c0,9-4.9,13.3-14.2,13.3h-17.8V18.7z' />
            <path d='M100.9,89.7h19.3V19.8H148V2.6H73.1v17.2h27.8V89.7z' />
            <path d='M34.9,30.2v13.3c-9.8,0-16.9-4.2-16.9-13c0-8.8,6.2-14,17.4-14c9.2,0,14.8,3.8,16.1,8.8h17C67.3,11.3,54.1,0,35,0 C14.9,0,0.6,12.5,0.6,30.9S15.5,60.1,35,60.1V47.6c10.3,0,17.4,4.6,17.4,13.6c0,9-7.3,14-17.3,14c-9.1,0-15.4-4-17.3-9.5H0 c2.5,14.5,15.8,25.8,35,25.8c19.2,0,34.7-11.5,34.7-30.7C69.6,42.8,56.1,30.2,34.9,30.2z' />
            <path d='M192.9,73.9c-15.4,0-26.6-12.8-26.6-28.1c0-16.7,9.9-27.7,26.6-27.7c15.4,0,27.4,11.8,27.4,27.7h17.3 c0-24.8-19.3-45.7-44.7-45.7C165.6,0,148,19,148,45.7c0,24.8,19.5,45.7,44.9,45.7V73.9z' />
            <path d='M192.4,81c19.4,0,34-15.3,34-35.7h-15.8c0,11-8,19-18.1,19V81z' />
          </svg>
        </div>
        <div className='container content-container'>
          <div className='left-column w-full lg:w-[550px] flex flex-col justify-between'>
            <StatsPanel className='stats-panel mb-4' />
            <TransactionTable className='transaction-table flex-grow' />
          </div>

          <div className='right-column w-full lg:w-[800px] bg-black/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50 chat-panel flex flex-col'>
            <div className='flex items-center justify-between p-4 border-b border-gray-800'>
              <h2 className='text-xl font-[var(--font-space-grotesk),_var(--font-ibm-plex-mono),_sans-serif] text-white'>
                MCP Agent Playground
              </h2>
              <ToolsPanel setInputValue={setInputValue} />
            </div>

            {/* MCP Server Selector Section */}
            <div className='p-4 border-b border-gray-800/50 bg-gray-900/30'>
              <MCPServerSelector
                servers={MCP_SERVERS}
                selectedServerId={selectedMCPServerId}
                onServerSelect={handleMCPServerSelect}
              />
            </div>

            {aiMessages.length === 0 && status === "error" && (
              <div className='p-4 bg-red-100 border border-red-300 rounded-md mb-4 text-red-700'>
                <p className='font-semibold'>Error connecting to AI service</p>
                <p className='text-sm'>Please try again or switch to a different MCP.</p>
              </div>
            )}

            <div
              className='chat-messages p-4 space-y-4 bg-transparent custom-scrollbar flex-grow overflow-y-auto'
              style={{overscrollBehavior: "contain"}}
            >
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "bot" && (
                    <div className='w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mr-2 overflow-hidden'>
                      <img
                        src='https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-tYmOJmh3dJRJCALKRzftQghOKKJRT8.png'
                        alt='Story MCP'
                        className='w-5 h-5'
                      />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-3 max-w-[80%] chat-message ${
                      message.sender === "user"
                        ? "bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white backdrop-blur-sm"
                        : "bg-gray-800/70 text-gray-100 backdrop-blur-sm"
                    }`}
                  >
                    <MemoizedMarkdown
                      content={message.content}
                      components={markdownComponents}
                    />
                    <p className='text-xs opacity-70 mt-1'>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {message.sender === "user" && (
                    <div className='w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center ml-2'>
                      <span className='text-sm font-medium'>U</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <motion.div
                  className='flex justify-start'
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, opacity: { duration: 0.15 } }}
                >
                  <div className='w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mr-2 overflow-hidden'>
                    <img
                      src='https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-tYmOJmh3dJRJCALKRzftQghOKKJRT8.png'
                      alt='Story MCP'
                      className='w-5 h-5'
                    />
                  </div>

                  <div
                    className={`rounded-2xl p-3 max-w-[80%] chat-message "bg-gray-800/70 text-gray-100 backdrop-blur-sm`}
                  >
                    <LoadingBubble />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className='p-4 border-t border-gray-800/50 bg-black/80'>
              <form onSubmit={handleSendMessage} className='flex gap-2'>
                <div className='flex-1 relative'>
                  <div className='relative w-full px-4 py-3 bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-3xl text-white focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500'>
                    <textarea
                      value={aiInput}
                      onChange={e => {
                        handleInputChange(e)
                        // Auto-adjust height
                        e.target.style.height = "inherit"
                        e.target.style.height = `${Math.min(
                          e.target.scrollHeight,
                          200
                        )}px` // Max height of 200px
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          if (aiInput.trim()) {
                            handleSubmit(e as React.KeyboardEvent)
                          }
                        }
                      }}
                      placeholder={
                        selectedMCPServerId === "storyscan"
                          ? "Ask about a wallet address, transaction, or blockchain stats using Storyscan MCP..."
                          : "Ask about Story Protocol or send IP tokens to an address using Story SDK MCP..."
                      }
                      rows={1}
                      autoComplete="off"
                      data-1p-ignore="true"
                      className='w-full bg-transparent text-white focus:ring-0 focus:outline-none scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-800 placeholder-gray-500 resize-none overflow-y-auto min-h-[48px] max-h-[200px]'
                      style={{
                        lineHeight: "1.5",
                      }}
                    />
                    <button
                      type='submit'
                      disabled={isLoading || !aiInput.trim()}
                      className='absolute right-3 top-1/2 transform -translate-y-1/2 size-8 aspect-square flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <ArrowRight className='h-5 w-5' />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <footer className='flex justify-center items-center mt-2'>
          <div className='flex items-center gap-2 text-white/80 hover:text-white transition-colors'>
            <span className='text-sm'>Powered by</span>
            <svg
              width='24'
              height='24'
              viewBox='0 0 276 270'
              fill='currentColor'
              xmlns='http://www.w3.org/2000/svg'
              className='text-current'
            >
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M115.899 40C115.899 34.4772 111.422 30 105.899 30H82.2002C76.6774 30 72.2002 34.4772 72.2002 40V63.6984C72.2002 69.2213 67.7231 73.6984 62.2002 73.6984H40C34.4772 73.6984 30 78.1756 30 83.6984V229.753C30 235.275 34.4771 239.753 40 239.753H63.6985C69.2213 239.753 73.6985 235.275 73.6985 229.753V83.6985C73.6985 78.1756 78.1756 73.6985 83.6985 73.6985H105.899C111.422 73.6985 115.899 69.2213 115.899 63.6985V40ZM203.296 40C203.296 34.4772 198.818 30 193.296 30H169.597C164.074 30 159.597 34.4771 159.597 40V63.6985C159.597 69.2213 164.074 73.6985 169.597 73.6985H191.797C197.32 73.6985 201.797 78.1756 201.797 83.6985V229.753C201.797 235.275 206.275 239.753 211.797 239.753H235.496C241.019 239.753 245.496 235.275 245.496 229.753V83.6984C245.496 78.1756 241.019 73.6984 235.496 73.6984H213.296C207.773 73.6984 203.296 69.2212 203.296 63.6984V40ZM159.597 123.651C159.597 118.129 155.12 113.651 149.597 113.651H125.899C120.376 113.651 115.899 118.129 115.899 123.651V188.551C115.899 194.074 120.376 198.551 125.899 198.551H149.597C155.12 198.551 159.597 194.074 159.597 188.551V123.651Z'
              />
            </svg>
          </div>
        </footer>
      </main>

      {/* Transaction signing modal - make it more noticeable */}
      {showSignModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md'>
          <div className='bg-gray-900 border-2 border-purple-500 rounded-xl max-w-md w-full p-6 shadow-2xl animate-pulse-slow'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-bold text-white'>Transaction Request</h3>
              <div className='px-2 py-1 bg-yellow-600 text-white text-xs rounded-full animate-pulse'>
                Action Required
              </div>
            </div>
            
            <p className='text-gray-300 mb-6 text-lg'>{pendingTransaction.message}</p>
            
            <div className='bg-black/50 p-4 rounded-lg mb-6 font-mono text-sm text-gray-300 overflow-x-auto border border-gray-700'>
              <p className='mb-2'>To: <span className='text-blue-400'>{pendingTransaction.transaction.to}</span></p>
              <p className='mb-2'>Amount: <span className='text-green-400 font-bold'>{Number(BigInt(pendingTransaction.transaction.value)) / 1e18} IP</span></p>
              <p>Gas: <span className='text-orange-400'>{parseInt(pendingTransaction.transaction.gas, 16)}</span></p>
            </div>
            
            <div className='flex justify-end space-x-4 mt-6'>
              <button
                onClick={() => {
                  setShowSignModal(false);
                  // Add message that transaction was rejected
                  setMessages(prev => [...prev, {
                    id: `tx-rejected-${Date.now()}`,
                    content: "Transaction rejected by user",
                    sender: "bot",
                    timestamp: new Date(),
                  }]);
                }}
                className='px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors'
              >
                Reject Transaction
              </button>
              <button
                onClick={handleSignTransaction}
                className='px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors font-bold'
                data-sign-tx-button
              >
                Sign Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interrupt confirmation modal */}
      {showInterruptModal && currentInterrupt && (
        <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4'>
          <div className='bg-gray-900 border-2 border-yellow-500 rounded-xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col'>
            {/* Fixed Header */}
            <div className='flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0'>
              <h3 className='text-xl font-bold text-white'>
                {currentInterrupt.operation || 'Tool Confirmation'}
              </h3>
              <div className={`px-2 py-1 text-white text-xs rounded-full ${
                currentInterrupt.severity === 'high' || currentInterrupt.severity === 'critical' 
                  ? 'bg-red-600' 
                  : 'bg-orange-600'
              }`}>
                {currentInterrupt.severity === 'high' ? 'High Risk' : 'Confirmation Required'}
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className='flex-1 overflow-y-auto p-6 space-y-4 modal-scrollable'>
              <p className='text-gray-300'>{currentInterrupt.message}</p>
              
              {/* Tool and operation details */}
              <div className='bg-black/50 p-4 rounded-lg border border-gray-700'>
                <h4 className='text-sm font-bold text-gray-400 mb-2'>Operation Details</h4>
                <p className='text-sm text-gray-300 mb-1'>Tool: <span className='text-blue-400'>{currentInterrupt.tool_name}</span></p>
                <p className='text-sm text-gray-300 break-words'>{currentInterrupt.description}</p>
              </div>

              {/* Parameters - with proper overflow handling */}
              {currentInterrupt.parameters && Object.keys(currentInterrupt.parameters).length > 0 && (
                <div className='bg-black/50 p-4 rounded-lg border border-gray-700'>
                  <h4 className='text-sm font-bold text-gray-400 mb-2'>Parameters</h4>
                  <div className='max-h-64 overflow-auto border border-gray-600 rounded p-2 bg-gray-900/50 parameters-container'>
                    <div className='text-xs font-mono text-gray-300 space-y-1'>
                      {Object.entries(currentInterrupt.parameters).map(([key, value]) => (
                        <div key={key} className='break-all'>
                          <div className='mb-1'>
                            <span className='text-orange-400 font-bold'>{key}:</span>
                          </div>
                          <div className='text-green-400 pl-2 border-l-2 border-green-500/30 ml-2 whitespace-pre-wrap break-all'>
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Fee information */}
              {currentInterrupt.fee_information && (
                <div className='bg-black/50 p-4 rounded-lg border border-yellow-700'>
                  <h4 className='text-sm font-bold text-yellow-400 mb-2'>Fee Information</h4>
                  <div className='text-sm text-gray-300 space-y-1'>
                    <p className='break-words'>Fee: <span className='text-yellow-400 font-bold'>{currentInterrupt.fee_information.fee_display}</span></p>
                    {currentInterrupt.fee_information.total_cost && (
                      <p className='break-words'>Total Cost: <span className='text-yellow-400 font-bold'>{currentInterrupt.fee_information.total_cost}</span></p>
                    )}
                    <p className='text-xs text-gray-500 break-words'>Token: {currentInterrupt.fee_information.fee_token}</p>
                  </div>
                </div>
              )}

              {/* Blockchain impact */}
              {currentInterrupt.blockchain_impact && (
                <div className='bg-black/50 p-4 rounded-lg border border-red-700'>
                  <h4 className='text-sm font-bold text-red-400 mb-2'>Blockchain Impact</h4>
                  <div className='text-sm text-gray-300 space-y-1'>
                    <p className='break-words'>Action: <span className='text-red-400'>{currentInterrupt.blockchain_impact.action}</span></p>
                    <p className='break-words'>Network: <span className='text-blue-400'>{currentInterrupt.blockchain_impact.network}</span></p>
                    {currentInterrupt.blockchain_impact.estimated_gas && (
                      <p className='break-words'>Est. Gas: <span className='text-orange-400'>{currentInterrupt.blockchain_impact.estimated_gas}</span></p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Fixed Footer */}
            <div className='flex justify-end space-x-4 p-6 border-t border-gray-700 flex-shrink-0'>
              <button
                onClick={() => handleInterruptConfirmation(false)}
                disabled={isInterruptProcessing}
                className={`px-4 py-3 text-white rounded-lg transition-colors ${
                  isInterruptProcessing 
                    ? 'bg-gray-600 cursor-not-allowed opacity-60' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isInterruptProcessing ? (
                  <div className='flex items-center space-x-2'>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Cancel Operation'
                )}
              </button>
              <button
                onClick={() => handleInterruptConfirmation(true)}
                disabled={isInterruptProcessing}
                className={`px-4 py-3 text-white rounded-lg transition-colors font-bold ${
                  isInterruptProcessing
                    ? 'bg-gray-600 cursor-not-allowed opacity-60'
                    : currentInterrupt.severity === 'high' || currentInterrupt.severity === 'critical'
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                }`}
              >
                {isInterruptProcessing ? (
                  <div className='flex items-center space-x-2'>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Confirm & Execute'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const LoadingBubble = () => {
  return (
    <div className='flex justify-start'>
      <div className='flex space-x-1 items-center h-4'>
        <div className='typing-dot w-2 h-2 bg-gray-500 rounded-full animate-pulse'></div>
        <div
          className='typing-dot w-2 h-2 bg-gray-500 rounded-full animate-pulse'
          style={{ animationDelay: '0.2s' }}
        ></div>
        <div
          className='typing-dot w-2 h-2 bg-gray-500 rounded-full animate-pulse'
          style={{ animationDelay: '0.4s' }}
        ></div>
      </div>
    </div>
  )
}
