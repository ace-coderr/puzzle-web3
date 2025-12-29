"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getUserSOLBalance } from "./getUserBalance";
import { Home, Gift, Trophy } from "lucide-react";

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
    <nav className="navbar">
      <div className="nav-container">
        {/* LEFT: Logo */}
        <Link href="/" className="logo">
          <img src="/images/logo.png" alt="Logo" />
        </Link>

        {/* RIGHT: Links + Wallet */}
        <div className="nav-right">
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

          <div className="wallet-section">
            {mounted && <WalletMultiButtonDynamic className="wallet-btn" />}
            {mounted && connected && publicKey && (
              <span className="balance">
                {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}