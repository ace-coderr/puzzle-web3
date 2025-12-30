"use client";
import { useState } from "react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import RecentActivity from "./recentBids";

type BidComponentProps = {
  wallet: WalletContextState;
  onBalanceUpdate?: (balance: number) => void;
};

const DIFFICULTY_META = {
  easy: { label: "EASY", multiplier: 1.1, moves: 40, time: 180 },
  medium: { label: "MEDIUM", multiplier: 1.5, moves: 30, time: 90 },
  hard: { label: "HARD", multiplier: 3.0, moves: 20, time: 60 },
} as const;

const TREASURY_WALLET =
  process.env.NEXT_PUBLIC_TREASURY_WALLET ||
  "Ebc5cNzxSe1DTaq6MDPFjzVmj2EUFPvpcVnFGU7jCSpq";

export default function BidComponent({ wallet, onBalanceUpdate }: BidComponentProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] =
    useState<keyof typeof DIFFICULTY_META>("medium");
  const [hoveredDifficulty, setHoveredDifficulty] =
    useState<keyof typeof DIFFICULTY_META | null>(null);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const quickOptions = [0.1, 0.5, 1, 2];

  const notifyDifficultyChange = (d: keyof typeof DIFFICULTY_META) => {
    setDifficulty(d);
    document.dispatchEvent(new CustomEvent("difficulty-change", { detail: d }));
  };

  const handleBid = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet!");
      return;
    }
    if (!amount || amount <= 0) {
      alert("Enter a valid bid amount.");
      return;
    }

    setLoading(true);
    try {
      const fromPubkey = wallet.publicKey;
      const toPubkey = new PublicKey(TREASURY_WALLET);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTx = await wallet.signTransaction(transaction);
      const txSignature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      await connection.confirmTransaction(txSignature, "confirmed");

      const gameId = `game-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: fromPubkey.toBase58(),
          amount,
          gameId,
          txSignature,
          difficulty,
        }),
      });

      if (onBalanceUpdate) {
        const balance = await connection.getBalance(fromPubkey);
        onBalanceUpdate(balance / LAMPORTS_PER_SOL);
      }

      document.dispatchEvent(new CustomEvent("recent-bid"));
      document.dispatchEvent(
        new CustomEvent("puzzle-restart", {
          detail: { walletAddress: fromPubkey.toBase58(), amount, gameId, difficulty },
        })
      );

      alert(`Success! ${amount} SOL bid placed.`);
    } catch (err) {
      console.error(err);
      alert("Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 w-full max-w-none mx-auto">
      <div className="bid-section max-w-md mx-auto">
        <h2 className="play-now">Play Now</h2>
        <hr className="hr" />

        {/* DIFFICULTY SELECTOR */}
        <div className="modes-selector">
          {(Object.keys(DIFFICULTY_META) as Array<keyof typeof DIFFICULTY_META>).map(
            (d) => {
              const meta = DIFFICULTY_META[d];
              return (
                <div
                  key={d}
                  className="difficulty-wrapper"
                  onMouseEnter={() => setHoveredDifficulty(d)}
                  onMouseLeave={() => setHoveredDifficulty(null)}
                >
                  <button
                    onClick={() => notifyDifficultyChange(d)}
                    className={`mode ${difficulty === d ? "active" : ""}`}
                  >
                    {meta.label}
                  </button>

                  {/* Tooltip */}
                  {hoveredDifficulty === d && (
                    <div className="difficulty-tooltip">
                      <div className="tooltip-multiplier">
                        {meta.multiplier}x Reward
                      </div>
                      <div className="tooltip-details">
                        {meta.moves} moves • {meta.time}s
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>

        {/* QUICK OPTIONS */}
        <div className="quick-options">
          {quickOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setAmount(opt)}
              disabled={loading}
              className={`quick-option ${amount === opt ? "selected" : ""}`}
            >
              {opt} SOL
            </button>
          ))}
        </div>

        <input
          type="number"
          step="0.001"
          min="0.001"
          placeholder="Or enter custom amount"
          value={amount ?? ""}
          onChange={(e) => setAmount(parseFloat(e.target.value) || null)}
          disabled={loading}
          className="custom-amount-input"
        />

        <button
          onClick={handleBid}
          disabled={loading || !amount}
          className="place-bid-btn"
        >
          {loading ? "Processing..." : "Place Bid & Play"}
        </button>

        <p className="bid-info">
          Bids go to treasury • Real SOL • Real wins
        </p>
      </div>

      <div className="recent-activity-wrapper max-w-8xl mx-auto">
        <RecentActivity />
      </div>
    </div>
  );
}