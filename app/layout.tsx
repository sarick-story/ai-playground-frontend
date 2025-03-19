import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import Web3Providers from './Web3Providers';
import { StoryProvider } from "@/lib/context/StoryContext"
import { Header } from "@/components/header"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Story AI Chat',
  description: 'Chat with the Story AI assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Providers>
          <StoryProvider>
            <Header />
            {children}
          </StoryProvider>
        </Web3Providers>
      </body>
    </html>
  );
}

