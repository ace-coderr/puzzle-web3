import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppWalletProvider } from "./components/appWalletProvider";
import { Navbar } from "./components/navbar";

// Geist Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Metadata
export const metadata: Metadata = {
  title: "Puzzle Web3",
  description: "A Solana-powered puzzle game with rewards and leaderboards.",
  keywords: "solana, puzzle, web3, blockchain, game, leaderboard, rewards",
  authors: [{ name: "ace_coderr" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0f172a",
  openGraph: {
    title: "Puzzle Web3",
    description: "Play, win, earn SOL.",
    type: "website",
    locale: "en_US",
  },
};

// Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        {/* Solana Wallet Adapter CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/@solana/wallet-adapter-react-ui/styles.css"
        />
      </head>

      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          font-sans 
          antialiased 
          bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 
          text-black 
          min-h-screen
        `}
      >
        {/* Wallet Provider (SSR-safe) */}
        <AppWalletProvider>
          {/* Persistent Navbar */}
          <Navbar />

          {/* Page Content */}
          <main className="min-h-screen">{children}</main>
        </AppWalletProvider>
      </body>
    </html>
  );
}