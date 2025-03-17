import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google"
import Web3Providers from "./Web3Providers"
import { StoryProvider } from "@/lib/context/StoryContext"
import { Header } from "@/components/header"

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "Story MCP",
  description: "Interactive chat interface for Story MCP",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} ${spaceGrotesk.variable} font-mono`}>
        <Web3Providers>
          <StoryProvider>
            <Header />
            {children}
          </StoryProvider>
        </Web3Providers>
      </body>
    </html>
  )
}

