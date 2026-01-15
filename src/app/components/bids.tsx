"use client";
import { useState } from "react";
import { Connection, LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { ComputeBudgetProgram } from "@solana/web3.js";
import RecentActivity from "./recentBids";

type BidComponentProps = {
  wallet: WalletContextState;
  onBalanceUpdate?: (balance: number) => void;
};

const DIFFICULTY_META = {
  easy: { label: "EASY", multiplier: 1.1, time: 180 },
  medium: { label: "MEDIUM", multiplier: 1.5, time: 90 },
  hard: { label: "HARD", multiplier: 3.0, time: 60 },
} as const;

const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || "Ebc5cNzxSe1DTaq6MDPFjzVmj2EUFPvpcVnFGU7jCSpq";

const calculateReward = (amount: number, difficulty: keyof typeof DIFFICULTY_META) =>
  amount * DIFFICULTY_META[difficulty].multiplier;

export default function BidComponent({ wallet, onBalanceUpdate }: BidComponentProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_META>("medium");
  const [hoveredDifficulty, setHoveredDifficulty] = useState<keyof typeof DIFFICULTY_META | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
  });

  const quickOptions = [0.1, 0.5, 1, 2];

  const notifyDifficultyChange = (d: keyof typeof DIFFICULTY_META) => {
    setDifficulty(d);
    document.dispatchEvent(new CustomEvent("difficulty-change", { detail: d }));
  };

  // Handle placing a bid
  const handleBid = async () => {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      toast.warning("Please connect your wallet");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Enter a valid bid amount");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Confirm transaction in your wallet...");

    try {
      const fromPubkey = wallet.publicKey;
      const toPubkey = new PublicKey(TREASURY_WALLET);

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      if (lamports <= 0) throw new Error("Invalid amount");

      const transaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      transaction.feePayer = fromPubkey;

      const txSignature = await wallet.sendTransaction(
        transaction,
        connection,
        { skipPreflight: false }
      );

      await connection.confirmTransaction(txSignature, "finalized");

      const gameId = `game-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const res = await fetch("/api/bids", {
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save bid");
      }

      document.dispatchEvent(new CustomEvent("recent-bid"));

      if (onBalanceUpdate) {
        const balance = await connection.getBalance(fromPubkey);
        onBalanceUpdate(balance / LAMPORTS_PER_SOL);
      }

      document.dispatchEvent(
        new CustomEvent("puzzle-restart", {
          detail: {
            walletAddress: fromPubkey.toBase58(),
            amount,
            gameId,
            difficulty,
          },
        })
      );

      toast.success(`Bid placed: ${amount} SOL`, { id: loadingToast });
    } catch (err: any) {
      console.error("Bid failed:", err);
      toast.error(err?.message || "Transaction failed", {
        id: loadingToast,
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col gap-10 w-full max-w-none mx-auto">
      <div className="bid-section max-w-md mx-auto">
        <h2 className="play-now">Play Now</h2>
        <hr className="hr" />

        {/* Difficulty Selector */}
        <div className="modes-selector">
          {(Object.keys(DIFFICULTY_META) as Array<keyof typeof DIFFICULTY_META>).map((d) => {
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
                {hoveredDifficulty === d && (
                  <div className="difficulty-tooltip">
                    <div className="tooltip-multiplier">{meta.multiplier}x Reward</div>
                    <div className="tooltip-details">{meta.time}s time limit</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Options */}
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

        {/* Custom Amount */}
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

        {/* Place Bid Button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || !amount}
          className="place-bid-btn"
        >
          Place Bid & Play
        </button>
        <p className="bid-info">Bids go to treasury • Real SOL • Real wins</p>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-wrapper max-w-8xl mx-auto">
        <RecentActivity />
      </div>

      {/* Confirmation Modal */}
      {showConfirm && amount && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3 className="confirm-title">
              Confirm Your Bid
            </h3>

            <div className="confirm-details">
              <div className="confirm-row">
                <span>Bid Amount</span>
                <span className="value">{amount} SOL</span>
              </div>

              <div className="confirm-row">
                <span>Difficulty</span>
                <span className="value">{DIFFICULTY_META[difficulty].label}</span>
              </div>

              <div className="confirm-row">
                <span>Reward Multiplier</span>
                <span className="value">{DIFFICULTY_META[difficulty].multiplier}x</span>
              </div>

              <div className="confirm-row highlight">
                <span>Potential Reward</span>
                <span className="value reward">{calculateReward(amount, difficulty).toFixed(3)} SOL</span>
              </div>

              <div className="confirm-row">
                <span>Moves / Time</span>
                <span className="value">{DIFFICULTY_META[difficulty].time}s</span>
              </div>
            </div>

            <div className="confirm-actions">
              <button onClick={() => setShowConfirm(false)} className="btn cancel">Cancel</button>
              <button
                onClick={() => { setShowConfirm(false); handleBid(); }}
                className="btn confirm"
              >
                Confirm & Pay
              </button>
            </div>

            <p className="confirm-note">Wallet approval required to complete this transaction</p>
          </div>
        </div>
      )}
    </div>
  );
}