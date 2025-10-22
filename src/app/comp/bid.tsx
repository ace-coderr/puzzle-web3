"use client";

import { useState } from "react";
import {
  Connection,
  clusterApiUrl,
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

// ⚙️ Treasury wallet where bids are sent
const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || "Ebc5cNzxSe1DTaq6MDPFjzVmj2EUFPvpcVnFGU7jCSpq";

export default function BidComponent({ wallet, onBalanceUpdate }: BidComponentProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Use your RPC from .env if available
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");

  const quickOptions = [0.1, 0.5, 1, 2];

  const handleBid = async () => {
    if (!wallet.publicKey) return alert("Please connect your wallet first!");
    if (!amount || amount <= 0) return alert("Enter a valid bid amount.");

    try {
      setLoading(true);

      const fromPubkey = wallet.publicKey;
      const toPubkey = new PublicKey(TREASURY_WALLET);
      const lamports = amount * LAMPORTS_PER_SOL;

      // ✅ Create Solana transaction to send SOL to treasury
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      transaction.feePayer = fromPubkey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // ✅ Sign and send transaction
      const signedTx = await wallet.signTransaction!(transaction);
      const txSignature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txSignature, "confirmed");

      console.log("✅ SOL sent to treasury:", txSignature);

      // ✅ Notify backend & deduct balance from DB
      const gameId = "puzzle-" + Date.now();

      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toString(),
          amount,
          gameId,
          txSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save bid.");

      // ✅ Refresh wallet balance in UI
      if (onBalanceUpdate) {
        const newBalance = await connection.getBalance(wallet.publicKey);
        onBalanceUpdate(newBalance / LAMPORTS_PER_SOL);
      }

      // Notify puzzle/game refresh
      document.dispatchEvent(new Event("recent-activity-refresh"));
      document.dispatchEvent(
        new CustomEvent("puzzle-restart", { detail: { gameId } })
      );

      alert(`✅ ${amount} SOL bid placed successfully!`);
    } catch (err: any) {
      console.error("❌ Bid Error:", err);
      alert(`Transaction failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 text-white p-6 rounded-2xl shadow-lg w-[360px]">
      <h2 className="text-2xl font-bold mb-4">🎯 Place Your Bid</h2>

      <div className="flex gap-3 mb-4">
        {quickOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setAmount(opt)}
            className={`px-4 py-2 rounded-lg border ${amount === opt
                ? "bg-blue-600 border-blue-400"
                : "bg-gray-700 hover:bg-gray-600"
              }`}
          >
            {opt} SOL
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="Enter custom amount"
        value={amount ?? ""}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full p-2 text-center rounded mb-4 bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleBid}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-60"
      >
        {loading ? "Waiting for Confirmation..." : "Place Bid"}
      </button>
    </div>
  );
}