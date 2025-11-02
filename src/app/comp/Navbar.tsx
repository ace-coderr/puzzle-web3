"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getUserSOLBalance } from "./GetUserBalance";

// 🟢 Import WalletMultiButton dynamically to disable SSR
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Navbar() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // ✅ Prevent mismatch by rendering only after hydration
  useEffect(() => setMounted(true), []);

  // 🔹 Fetch wallet balance when connected
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

      {/* 🔹 Right: Wallet + Rewards + Balance */}
      {mounted && (
        <div className="flex items-center gap-5">
          {publicKey && (
            <Link
              href="/reward"
              className="text-blue-400 hover:text-blue-300 transition font-medium"
            >
              🎁 Rewards
            </Link>
          )}

          {/* ✅ Dynamically loaded wallet button */}
          <WalletMultiButtonDynamic />

          {publicKey && (
            <div className="text-sm text-gray-300">
              💰 {balance !== null ? balance.toFixed(4) : "Loading..."} SOL
            </div>
          )}
        </div>
      )}
    </nav>
  );
}