"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getUserSOLBalance } from "./GetUserBalance";

export function Navbar() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  // 🔹 Fetch wallet balance when wallet connects
  useEffect(() => {
    if (!publicKey) return;

    const fetchBalance = async () => {
      try {
        const sol = await getUserSOLBalance(publicKey.toBase58());
        setBalance(sol);
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    };

    fetchBalance();
  }, [publicKey]);

  return (
    <nav className="bg-gray-900 p-4 text-white flex justify-between items-center shadow-md border-b border-gray-800">
      {/* 🔹 Left: Game title */}
      <Link href="/" className="text-lg font-bold tracking-wide">
        🧩 Puzzle Game
      </Link>

      {/* 🔹 Right: Wallet connection + Rewards + Balance */}
      <div className="flex items-center gap-5">
        {/* Show Rewards link only when wallet is connected */}
        {publicKey && (
          <Link
            href="/reward"
            className="text-blue-400 hover:text-blue-300 transition font-medium"
          >
            🎁 Rewards
          </Link>
        )}

        {/* Wallet connect button */}
        <WalletMultiButton />

        {/* Balance display */}
        {publicKey && (
          <div className="text-sm text-gray-300">
            💰 {balance !== null ? balance.toFixed(4) : "Loading..."} SOL
          </div>
        )}
      </div>
    </nav>
  );
}