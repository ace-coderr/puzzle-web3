"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import "./css/style.css";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getUserSOLBalance } from "./getUserBalance";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Navbar() {
  const { publicKey, connected } = useWallet();
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const sol = await getUserSOLBalance(publicKey.toBase58());
        setBalance(sol);
      } catch (err) {
        console.error("Balance fetch failed:", err);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10_000);
    return () => clearInterval(interval);
  }, [publicKey]);

  return (
    <nav className="header">
      <div className="nav-container">

        {/* LEFT: Puzzle Game */}
        <Link
          href="/"
          className="logo"
        >
          <img src="/images/logo.png" alt="" />
        </Link>

        {mounted && connected && (
          <div className="flex items-center gap-3">

            <Link href="/" className="home">
              Home
            </Link>

            <Link href="/reward" className="reward">
              Rewards
            </Link>

            <Link href="/leaderboard" className="leaderboard">
              Leaderboard
            </Link>

            {/* WALLET */}
            <div className="flex items-center gap-3 bg-slate-800/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700">
              <WalletMultiButtonDynamic
                className="!bg-gradient-to-r !from-yellow-500 !to-orange-500 !text-black !font-bold !text-sm !px-4 !py-2 !rounded-lg
                   hover:!from-yellow-400 hover:!to-orange-400 transition-all duration-300 transform hover:scale-105 !shadow-md"
              />

              {publicKey && (
                <div className="font-mono text-sm">
                  <span className="text-gray-400">Balance:</span>{" "}
                  <span className="text-yellow-400 font-bold">
                    {balance !== null ? `${Number(balance.toFixed(4)).toString()} SOL` : "Loading"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        {mounted && !connected && (
          <WalletMultiButtonDynamic
            className="!bg-gradient-to-r !from-yellow-500 !to-orange-500 !text-black !font-bold !text-sm !px-4 !py-2 !rounded-lg hover:!from-yellow-400 hover:!to-orange-400 transition-all duration-300 transform hover:scale-105 !shadow-md"
          />
        )}
      </div>
    </nav>
  );
}