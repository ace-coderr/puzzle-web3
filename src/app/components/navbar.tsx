"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getUserSOLBalance } from "./getUserBalance";
import { Home, Gift, Trophy, Volume2, VolumeX } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Navbar() {
  const { publicKey, connected } = useWallet();
  const pathname = usePathname();

  const { toggleMute, unlockAudio } = useGameSounds();
  const [muted, setMuted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      const sol = await getUserSOLBalance(publicKey.toBase58());
      setBalance(sol);
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10_000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const links = [
    { href: "/", label: "Home", icon: <Home size={18} /> },
    { href: "/reward", label: "Rewards", icon: <Gift size={18} /> },
    { href: "/leaderboard", label: "Leaderboard", icon: <Trophy size={18} /> },
  ];

  return (
    <nav
      className="navbar"
      onClick={unlockAudio}
    >
      <div className="nav-container">
        {/* ================= LOGO ================= */}
        <Link href="/" className="logo">
          <img src="/images/logo.png" alt="Logo" />
        </Link>

        {/* ================= RIGHT SIDE ================= */}
        <div className="nav-right">
          {mounted && connected && (
            <div className="nav-links">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link ${isActive ? "active" : ""}`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* 🔇 MUTE TOGGLE */}
          <button
            className="mute-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMuted(toggleMute());
            }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* ========== WALLET / BALANCE ========== */}
          <div className="wallet-section">
            {mounted && !connected && (
              <WalletMultiButtonDynamic className="wallet-btn" />
            )}

            {mounted && connected && publicKey && (
              <>
                <WalletMultiButtonDynamic className="wallet-btn" />
                <span className="balance">
                  {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}