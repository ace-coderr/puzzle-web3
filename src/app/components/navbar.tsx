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
    <nav className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 p-4 text-white shadow-2xl border-b border-gray-800 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="flex items-center justify-between w-full px-4 md:px-8">

        {/* LEFT: Puzzle Game */}
        <Link
          href="/"
          className="text-3xl font-black tracking-tighter bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent hover:from-yellow-300 hover:to-pink-400 transition-all duration-300 transform hover:scale-105"
        >
          Puzzle Game
        </Link>

        {/* RIGHT: Actions */}
        {mounted && connected && (
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`px-5 py-2.5 rounded-xl border transition-all duration-300 shadow-lg font-bold text-sm whitespace-nowrap ${pathname === "/"
                  ? "bg-blue-600/40 border-blue-500 text-blue-200"
                  : "bg-blue-600/20 border-blue-500/30 text-blue-300 hover:border-blue-400"
                }`}
            >
              Home
            </Link>

            <Link
              href="/leaderboard"
              className={`px-5 py-2.5 rounded-xl border transition-all duration-300 shadow-lg font-bold text-sm whitespace-nowrap ${pathname === "/leaderboard"
                ? "bg-purple-600/40 border-purple-500 text-purple-200"
                : "bg-purple-600/20 border-purple-500/30 text-purple-300 hover:border-purple-400"
                }`}
            >
              Leaderboard
            </Link>

            <Link
              href="/reward"
              className={`px-5 py-2.5 rounded-xl border transition-all duration-300 shadow-lg font-bold text-sm whitespace-nowrap ${pathname === "/reward"
                ? "bg-emerald-600/40 border-emerald-500 text-emerald-200"
                : "bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:border-emerald-400"
                }`}
            >
              Rewards
            </Link>

            <div className="flex items-center gap-3 bg-slate-800/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700">
              <WalletMultiButtonDynamic
                className="!bg-gradient-to-r !from-yellow-500 !to-orange-500 !text-black !font-bold !text-sm !px-4 !py-2 !rounded-lg hover:!from-yellow-400 hover:!to-orange-400 transition-all duration-300 transform hover:scale-105 !shadow-md"
              />

              {publicKey && (
                <div className="font-mono text-sm">
                  <span className="text-gray-400">Balance:</span>{" "}
                  <span className="text-yellow-400 font-bold">
                    {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading"}
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