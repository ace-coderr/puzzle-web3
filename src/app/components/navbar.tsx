"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getUserSOLBalance } from "./getUserBalance";
import { Home, Gift, Trophy, Volume2, VolumeX } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";

/* ================= WALLET BUTTON ================= */
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Navbar() {
  const { publicKey, connected } = useWallet();
  const pathname = usePathname();

  const {
    unlockAudio,
    setMuted: setSoundMuted,
    playBg,
    playClick,
  } = useGameSounds();

  const [muted, setMuted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  /* ✅ CLIENT MOUNT */
  useEffect(() => setMounted(true), []);

  // UNLOCK AUDIO ON FIRST INTERACTION
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
      playBg();
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [unlockAudio, playBg]);

  /* BALANCE */
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let active = true;

       fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),

        }),
      });

    const fetchBalance = async () => {
      const sol = await getUserSOLBalance(publicKey.toBase58());
      if (active) setBalance(sol);
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [publicKey]);

  /* GLOBAL CLICK SOUND - MODIFIED TO EXCLUDE GAME ELEMENTS */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (muted) return;

      // Don't play click sound on game elements
      const target = e.target as HTMLElement;
      const isGameElement =
        target.closest('.puzzle-board') ||
        target.closest('.tile-element') ||
        target.closest('[draggable="true"]') ||
        target.closest('.puzzle-tile');

      if (!isGameElement) {
        playClick();
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [playClick, muted]);

  const links = [
    { href: "/", label: "Home", icon: <Home size={18} /> },
    { href: "/reward", label: "Rewards", icon: <Gift size={18} /> },
    { href: "/leaderboard", label: "Leaderboard", icon: <Trophy size={18} /> },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">

        {/* LOGO */}
        <Link href="/" className="logo">
          <img src="/images/logo.png" alt="Logo" />
        </Link>

        {/* NAVIGATION LINKS */}
        <div className="nav-right">
          {mounted && connected && (
            <div className="nav-links">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${pathname === link.href ? "active" : ""
                    }`}
                  onClick={(e) => {
                    if (!muted) playClick();
                  }}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* MUTE TOGGLE */}
          <button
            className="mute-btn"
            onClick={(e) => {
              e.stopPropagation();
              const next = !muted;
              setMuted(next);
              setSoundMuted(next);
              if (!next) playClick();
            }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* WALLET */}
          <div className="wallet-section">
            {mounted && !connected && (
              <WalletMultiButtonDynamic
                className="wallet-btn"
                onClick={() => {
                  if (!muted) playClick();
                }}
              />
            )}

            {mounted && connected && publicKey && (
              <>
                <WalletMultiButtonDynamic
                  className="wallet-btn"
                  onClick={() => {
                    if (!muted) playClick();
                  }}
                />
                <span className="balance">
                  {balance !== null
                    ? `${balance.toFixed(4)} SOL`
                    : "Loading…"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}