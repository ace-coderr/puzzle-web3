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
const TREASURY_WALLET =
  process.env.NEXT_PUBLIC_TREASURY_WALLET ||
  "Ebc5cNzxSe1DTaq6MDPFjzVmj2EUFPvpcVnFGU7jCSpq";
export default function BidComponent({
  wallet,
  onBalanceUpdate,
}: BidComponentProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] =
    useState<"easy" | "medium" | "hard">("medium");
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const quickOptions = [0.1, 0.5, 1, 2];
  const notifyDifficultyChange = (d: "easy" | "medium" | "hard") => {
    setDifficulty(d);
    document.dispatchEvent(
      new CustomEvent("difficulty-change", { detail: d })
    );
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
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
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
          detail: {
            walletAddress: fromPubkey.toBase58(),
            amount,
            gameId,
            difficulty,
          },
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
    <div className="flex flex-col gap-10 max-w-5xlxl w-full">
      {/* BID SECTION */}
      <div className="bid-section">
        <h2 className="play-now">Play Now</h2>
        <hr className="hr" />
        <div className="modes-selector text-white">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => notifyDifficultyChange(d)}
              className={`mode ${difficulty === d ? "bg-blue-900" : ""}`}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="quick-options1">
          {quickOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setAmount(opt)}
              disabled={loading}
              className={`quick-options2 ${amount === opt ? "bg-emerald-600" : "bg-gray-900"
                }`}
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
          onChange={(e) =>
            setAmount(parseFloat(e.target.value) || null)
          }
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

      {/* RECENT ACTIVITY */}
      <RecentActivity />
    </div>
  );
}