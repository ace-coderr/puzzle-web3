"use client";

import { useState } from "react";
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js";

type BidComponentProps = {
  wallet: any;
  onBalanceUpdate: (balance: number) => void;
};

export default function BidComponent({ wallet, onBalanceUpdate }: BidComponentProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const quickOptions = [0.1, 0.5, 1, 2];

  const handleBid = async () => {
    if (!wallet?.publicKey) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter a valid bid amount.");
      return;
    }

    try {
      setLoading(true);

      const lamports = amount * LAMPORTS_PER_SOL;
      const recipient = wallet.publicKey; // for now, sending to self; replace with your app’s treasury wallet

      // Create Solana transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: recipient,
          lamports,
        })
      );

      transaction.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // ✋ Request manual confirmation from wallet
      const signedTx = await wallet.signTransaction(transaction);
      const txSignature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txSignature, "confirmed");

      console.log("✅ Transaction confirmed:", txSignature);

      // 🔹 Save bid on backend
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toString(),
          amount,
          status: "SUCCESS",
          txSignature,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save bid.");

      // 🔹 Start game after successful confirmation
      document.dispatchEvent(
        new CustomEvent("puzzle-restart", {
          detail: { imageUrl: data.imageUrl, startTime: data.startTime },
        })
      );

      document.dispatchEvent(new Event("recent-activity-refresh"));

      alert("✅ Bid placed and confirmed manually! Game starting...");
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

      {/* Quick-select buttons */}
      <div className="flex gap-3 mb-4">
        {quickOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setAmount(opt)}
            className={`px-4 py-2 rounded-lg border ${
              amount === opt ? "bg-blue-600 border-blue-400" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {opt} SOL
          </button>
        ))}
      </div>

      {/* Custom amount input */}
      <input
        type="number"
        placeholder="Enter custom amount"
        value={amount ?? ""}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full p-2 text-center rounded mb-4 bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Place Bid Button */}
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