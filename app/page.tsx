"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { TransactionTable } from "@/components/transaction-table";
import { StatsPanel } from "@/components/stats-panel";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [program, setProgram] = useState<WebGLProgram | null>(null);
  const [time, setTime] = useState(0);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [timeLocation, setTimeLocation] = useState<WebGLUniformLocation | null>(
    null
  );
  const [mouseLocation, setMouseLocation] =
    useState<WebGLUniformLocation | null>(null);
  const [resolutionLocation, setResolutionLocation] =
    useState<WebGLUniformLocation | null>(null);

  // Use Vercel AI SDK for chat
  const {
    messages: aiMessages,
    input: aiInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish: (message) => {
      console.log("Chat finished:", message);
    },
    onResponse: (response) => {
      console.log("Got response:", response);
      // Check if the response is ok
      if (!response.ok) {
        console.error("Response error:", response.status, response.statusText);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Add debugging for aiMessages
  useEffect(() => {
    console.log("AI Messages updated:", aiMessages);
  }, [aiMessages]);

  // Update our messages state when AI SDK messages change
  useEffect(() => {
    if (aiMessages.length > 0) {
      const newMessages = aiMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: (msg.role === "user" ? "user" : "bot") as "user" | "bot",
        timestamp: new Date(),
      }));

      // Always include the welcome message at the beginning
      const welcomeMessage: Message = {
        id: "welcome",
        content: "Hello! How can I help you today?",
        sender: "bot",
        timestamp: new Date(),
      };

      // Check if there's already a welcome message in the mapped messages
      const hasWelcomeInNew = newMessages.some((msg) => msg.id === "welcome");

      if (!hasWelcomeInNew) {
        // Add the welcome message at the beginning if it's not already there
        setMessages([welcomeMessage, ...(newMessages as Message[])]);
      } else {
        setMessages(newMessages as Message[]);
      }
    }
  }, [aiMessages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newGl = canvas.getContext("webgl");
    if (!newGl) return;

    setGl(newGl);

    const vertexShader = newGl.createShader(newGl.VERTEX_SHADER);
    if (!vertexShader) return;

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
    );
    newGl.compileShader(vertexShader);

    const fragmentShader = newGl.createShader(newGl.FRAGMENT_SHADER);
    if (!fragmentShader) return;

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
    );
    newGl.compileShader(fragmentShader);

    const newProgram = newGl.createProgram();
    if (!newProgram) return;

    newGl.attachShader(newProgram, vertexShader);
    newGl.attachShader(newProgram, fragmentShader);
    newGl.linkProgram(newProgram);
    setProgram(newProgram);

    const positionBuffer = newGl.createBuffer();
    newGl.bindBuffer(newGl.ARRAY_BUFFER, positionBuffer);
    newGl.bufferData(
      newGl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      newGl.STATIC_DRAW
    );

    const positionLocation = newGl.getAttribLocation(newProgram, "position");
    newGl.enableVertexAttribArray(positionLocation);
    newGl.vertexAttribPointer(positionLocation, 2, newGl.FLOAT, false, 0, 0);

    const newTimeLocation = newGl.getUniformLocation(newProgram, "u_time");
    const newMouseLocation = newGl.getUniformLocation(newProgram, "u_mouse");
    const newResolutionLocation = newGl.getUniformLocation(
      newProgram,
      "u_resolution"
    );

    setTimeLocation(newTimeLocation);
    setMouseLocation(newMouseLocation);
    setResolutionLocation(newResolutionLocation);

    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX / window.innerWidth);
      setMouseY(1.0 - e.clientY / window.innerHeight);
    };

    window.addEventListener("mousemove", handleMouseMove);

    const startTime = Date.now();

    let animationFrameId: number;

    const render = () => {
      if (
        !newGl ||
        !canvas ||
        !newProgram ||
        !newTimeLocation ||
        !newMouseLocation ||
        !newResolutionLocation
      )
        return;

      newGl.viewport(0, 0, canvas.width, canvas.height);

      const currentTime = (Date.now() - startTime) / 1000;
      setTime(currentTime);

      newGl.uniform1f(newTimeLocation, currentTime);
      newGl.uniform2f(newMouseLocation, mouseX, mouseY);
      newGl.uniform2f(newResolutionLocation, canvas.width, canvas.height);

      newGl.drawArrays(newGl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    newGl.useProgram(newProgram);

    const animate = () => {
      render();
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (gl && program) {
        gl.deleteProgram(program);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !gl ||
      !program ||
      !timeLocation ||
      !mouseLocation ||
      !resolutionLocation
    )
      return;

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.uniform1f(timeLocation, time);
    gl.uniform2f(mouseLocation, mouseX, mouseY);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  }, [
    time,
    mouseX,
    mouseY,
    program,
    gl,
    timeLocation,
    mouseLocation,
    resolutionLocation,
  ]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add this after the existing useEffect for scrollToBottom
  useEffect(() => {
    // Save the current scroll position
    const scrollPosition = window.scrollY;

    // After the component updates and scrolls to bottom
    return () => {
      // Restore the page scroll position
      window.scrollTo(0, scrollPosition);
    };
  }, [messages]);

  // Replace the handleSendMessage function with one that uses the AI SDK
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    handleSubmit(e);
  };

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />
      <main className="min-h-screen pb-32 pt-20 overflow-x-hidden">
        <div className="flex justify-center mb-12">
          <svg
            className="h-16 w-auto text-white"
            viewBox="0 0 398.4 91.4"
            fill="currentColor"
          >
            <path d="M352.2,89.7h18.4V52.8l27.7-50.2h-21.2l-24.9,46.5V89.7z" />
            <path d="M357.4,40.9L336.6,2.6h-20.9l20.9,38.3H357.4z" />
            <path d="M286.3,62.6l14.1,27.1h20l-17.6-32c8.1-5.6,12.9-14.6,12.9-24.9c0-16.8-10.5-30.1-33.1-30.1h-36.2v87.1h19.1V62.8 L286.3,62.6z M265.5,18.7h17.2c9.3,0,14.8,4.9,14.8,13.8c0,9-4.9,13.3-14.2,13.3h-17.8V18.7z" />
            <path d="M100.9,89.7h19.3V19.8H148V2.6H73.1v17.2h27.8V89.7z" />
            <path d="M34.9,30.2v13.3c-9.8,0-16.9-4.2-16.9-13c0-8.8,6.2-14,17.4-14c9.2,0,14.8,3.8,16.1,8.8h17C67.3,11.3,54.1,0,35,0 C14.9,0,0.6,12.5,0.6,30.9S15.5,60.1,35,60.1V47.6c10.3,0,17.4,4.6,17.4,13.6c0,9-7.3,14-17.3,14c-9.1,0-15.4-4-17.3-9.5H0 c2.5,14.5,15.8,25.8,35,25.8c19.2,0,34.7-11.5,34.7-30.7C69.6,42.8,56.1,30.2,34.9,30.2z" />
            <path d="M192.9,73.9c-15.4,0-26.6-12.8-26.6-28.1c0-16.7,9.9-27.7,26.6-27.7c15.4,0,27.4,11.8,27.4,27.7h17.3 c0-24.8-19.3-45.7-44.7-45.7C165.6,0,148,19,148,45.7c0,24.8,19.5,45.7,44.9,45.7V73.9z" />
            <path d="M192.4,81c19.4,0,34-15.3,34-35.7h-15.8c0,11-8,19-18.1,19V81z" />
          </svg>
        </div>
        <div className="container mx-auto flex flex-col lg:flex-row gap-8 items-start justify-center">
          <div className="flex flex-col gap-6 w-full lg:w-[600px]">
            <StatsPanel />
            <TransactionTable />
          </div>

          <div className="w-full max-h-[776px] flex flex-col lg:w-[600px] bg-black/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50">
            <div className="flex items-center justify-center p-4 border-b border-gray-800">
              <h2 className="text-xl font-['Acronym',_var(--font-ibm-plex-mono),_sans-serif] text-white">
                MCP Agent Playground
              </h2>
            </div>

            <div
              className="h-[600px] overflow-y-auto p-4 space-y-4 bg-transparent"
              style={{ overscrollBehavior: "contain" }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mr-2 overflow-hidden">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-tYmOJmh3dJRJCALKRzftQghOKKJRT8.png"
                        alt="Story MCP"
                        width={20}
                        height={20}
                        className="w-5 h-5"
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
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="break-words">{children}</p>
                        ),
                        // Add other elements you want to style
                        pre: ({ children }) => (
                          <pre className="break-words whitespace-pre-wrap">
                            {children}
                          </pre>
                        ),
                        code: ({ children }) => (
                          <code className="break-words">{children}</code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {message.sender === "user" && (
                    <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center ml-2">
                      <span className="text-sm font-medium">U</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-800/50 bg-black/80">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="relative w-full px-4 py-3 bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-3xl text-white focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
                    <textarea
                      value={aiInput}
                      onChange={(e) => {
                        handleInputChange(e);
                        // Auto-adjust height
                        e.target.style.height = "inherit";
                        e.target.style.height = `${Math.min(
                          e.target.scrollHeight,
                          200
                        )}px`; // Max height of 200px
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (aiInput.trim()) {
                            handleSubmit(e as React.FormEvent);
                          }
                        }
                      }}
                      placeholder="Ask about Story blockchain..."
                      rows={1}
                      className="w-full bg-transparent text-white focus:ring-0 focus:outline-none scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-800 placeholder-gray-500 resize-none overflow-y-auto min-h-[48px] max-h-[200px]"
                      style={{
                        lineHeight: "1.5",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !aiInput.trim()}
                      className="size-8 ml-auto aspect-square flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <footer className="flex justify-center items-center p-4">
          <div className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-sm">Powered by</span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 276 270"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              className="text-current"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M115.899 40C115.899 34.4772 111.422 30 105.899 30H82.2002C76.6774 30 72.2002 34.4772 72.2002 40V63.6984C72.2002 69.2213 67.7231 73.6984 62.2002 73.6984H40C34.4772 73.6984 30 78.1756 30 83.6984V229.753C30 235.275 34.4771 239.753 40 239.753H63.6985C69.2213 239.753 73.6985 235.275 73.6985 229.753V83.6985C73.6985 78.1756 78.1756 73.6985 83.6985 73.6985H105.899C111.422 73.6985 115.899 69.2213 115.899 63.6985V40ZM203.296 40C203.296 34.4772 198.818 30 193.296 30H169.597C164.074 30 159.597 34.4771 159.597 40V63.6985C159.597 69.2213 164.074 73.6985 169.597 73.6985H191.797C197.32 73.6985 201.797 78.1756 201.797 83.6985V229.753C201.797 235.275 206.275 239.753 211.797 239.753H235.496C241.019 239.753 245.496 235.275 245.496 229.753V83.6984C245.496 78.1756 241.019 73.6984 235.496 73.6984H213.296C207.773 73.6984 203.296 69.2212 203.296 63.6984V40ZM159.597 123.651C159.597 118.129 155.12 113.651 149.597 113.651H125.899C120.376 113.651 115.899 118.129 115.899 123.651V188.551C115.899 194.074 120.376 198.551 125.899 198.551H149.597C155.12 198.551 159.597 194.074 159.597 188.551V123.651Z"
              />
            </svg>
          </div>
        </footer>
      </main>
    </>
  );
}
