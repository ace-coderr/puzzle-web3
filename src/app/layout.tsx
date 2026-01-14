import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

import { AppWalletProvider } from "./components/appWalletProvider";
import { Navbar } from "./components/navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: {
    default: "Puzzle Web3",
    template: "%s | Puzzle Web3",
  },
  description: "A Solana-powered puzzle game with rewards and leaderboards.",
  keywords: "solana, puzzle, web3, blockchain, game, leaderboard, rewards",
  authors: [{ name: "ace_coderr" }],
  openGraph: {
    title: "Puzzle Web3",
    description: "Play, win, earn SOL.",
    type: "website",
    locale: "en_US",
  },
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@solana/wallet-adapter-react-ui/styles.css"
        />
      </head>

      <body
        className={`
          ${GeistSans.variable}
          ${GeistMono.variable}
          font-sans
          antialiased
          bg-linear-to-br from-slate-950 via-gray-900 to-slate-950
          min-h-screen
        `}
      >
        {/* ===== APP PROVIDERS ===== */}
        <AppWalletProvider>
          <Navbar />

          <main className="min-h-screen page-content">
            {children}
            <Analytics />
          </main>
        </AppWalletProvider>

        {/* ===== SONNER GLOBAL TOASTER ===== */}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "#0e0e0e",
              border: "1px solid #2a2a2a",
              color: "#ffffff",
            },
          }}
        />
      </body>
    </html>
  );
}