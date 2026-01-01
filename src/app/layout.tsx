import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Solana Wallet Adapter CSS */}
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
          bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950
          min-h-screen
        `}
      >
        <AppWalletProvider>
          <Navbar />
          <main className="min-h-screen page-content">
            {children}
          </main>
        </AppWalletProvider>
      </body>
    </html>
  );
}