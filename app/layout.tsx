import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
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
      <head>
        <link href="https://fonts.cdnfonts.com/css/acronym" rel="stylesheet" />
      </head>
      <body className={`${ibmPlexMono.variable} font-mono`}>{children}</body>
    </html>
  )
}

