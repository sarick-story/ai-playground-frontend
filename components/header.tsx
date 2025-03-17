"use client"

import { ConnectWalletButton } from "./connect-wallet-button"

export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 p-4 flex justify-end items-center">
      <ConnectWalletButton />
    </header>
  )
} 