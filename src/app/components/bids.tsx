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

type BidComponentProps = {
  wallet: WalletContextState;
  onBalanceUpdate?: (balance: number) => void;
};

// Treasury wallet
const TREASURY_WALLET =
  process.env.NEXT_PUBLIC_TREASURY_WALLET ||
  "Ebc5cNzxSe1DTaq6MDPFjzVmj2EUFPvpcVnFGU7jCSpq";

export default function BidComponent({
  wallet,
  onBalanceUpdate,
}: BidComponentProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const quickOptions = [0.1, 0.5, 1, 2];

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

      // Build transaction
      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // Get fresh blockhash
      let blockhash;
      for (let i = 0; i < 3; i++) {
        try {
          blockhash = await connection.getLatestBlockhash();
          break;
        } catch (err) {
          if (i === 2) throw err;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      transaction.recentBlockhash = blockhash!.blockhash;
      transaction.feePayer = fromPubkey;

      // Sign & send
      const signedTx = await wallet.signTransaction(transaction);
      const txSignature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log("Bid transaction sent:", txSignature);
      await connection.confirmTransaction(txSignature, "confirmed");

      // Generate gameId
      const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("currentGameId", gameId);

      // Save bid to backend
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: fromPubkey.toBase58(),
          amount,
          gameId,
          txSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save bid");

      // Update balance
      if (onBalanceUpdate) {
        const balance = await connection.getBalance(fromPubkey);
        onBalanceUpdate(balance / LAMPORTS_PER_SOL);
      }

      // Trigger real-time updates
      document.dispatchEvent(new CustomEvent("recent-bid"));
      document.dispatchEvent(
        new CustomEvent("puzzle-restart", {
          detail: { walletAddress: fromPubkey.toBase58(), amount, gameId },
        })
      );

      alert(`Success! ${amount} SOL bid placed. Game starting...`);
    } catch (err: any) {
      console.error("Bid failed:", err);
      alert(`Transaction failed: ${err.message || "Network error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-8 rounded-3xl shadow-2xl border border-gray-800 w-[380px]">
      <h2 className="text-3xl font-bold mb-6 text-emerald-400">Play Now</h2>

      <div className="grid grid-cols-2 gap-3 mb-5 w-full">
        {quickOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setAmount(opt)}
            disabled={loading}
            className={`py-3 rounded-xl font-semibold transition-all ${amount === opt
                ? "bg-emerald-600 ring-2 ring-emerald-400 shadow-lg scale-105"
                : "bg-gray-800 hover:bg-gray-700"
              } disabled:opacity-50`}
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
        className="w-full p-4 text-center text-lg rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6"
      />

      <button
        onClick={handleBid}
        disabled={loading || !amount}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xl rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span>
            Processing...
          </span>
        ) : (
          "Place Bid & Play"
        )}
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Bids go to treasury • Real SOL • Real wins
      </p>
    </div>
  );
}