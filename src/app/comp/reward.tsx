"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Reward = {
  id: string;
  title: string;
  description: string;
  amount: number;
  claimed: boolean;
};

export default function RewardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; tx?: string }>({ open: false });

  // 🔹 Fetch rewards
  useEffect(() => {
    if (!publicKey) return;
    const fetchRewards = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rewards?wallet=${publicKey.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load rewards");
        setRewards(data.rewards || []);
      } catch (err) {
        console.error("Error loading rewards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRewards();
  }, [publicKey]);

  const handleClaim = async () => {
    if (!publicKey) return alert("Please connect your wallet first.");
    setClaiming(true);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");

      setModal({ open: true, tx: data.txSignature });
      setRewards([]);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!publicKey)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-300">
        Connect your wallet to view rewards.
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-300">
        Loading rewards...
      </div>
    );

  if (rewards.length === 0)
    return (
      <main className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white">
        <h1 className="text-2xl font-bold mb-4">🏆 No Rewards Yet</h1>
        <p className="text-gray-400 mb-6">
          Play and win a game to earn your reward!
        </p>
        <Button
          onClick={() => router.push("/")}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl"
        >
          🔁 Play Again
        </Button>
      </main>
    );

  const reward = rewards[0];

  return (
    <main className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white px-6">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-3">🎉 You Won!</h1>
        <p className="text-gray-400 mb-6">{reward.description}</p>

        <div className="text-blue-400 text-2xl font-semibold mb-8">
          {reward.amount} SOL
        </div>

        <Button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
        >
          {claiming ? "Claiming..." : "Claim Reward"}
        </Button>

        <div className="mt-8">
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl"
          >
            🔁 Play Again
          </Button>
        </div>
      </div>

      {/* ✅ Success Modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 rounded-2xl p-8 text-center shadow-2xl border border-gray-700 w-[90%] max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <motion.div
                className="flex justify-center mb-4"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="bg-green-600 w-14 h-14 flex items-center justify-center rounded-full">
                  ✅
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold mb-3 text-green-400">
                Reward Claimed!
              </h2>
              <p className="text-gray-400 mb-5">
                Your 2× reward has been sent to your wallet.
              </p>

              {modal.tx && (
                <a
                  href={`https://solscan.io/tx/${modal.tx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline break-all text-sm"
                >
                  View Transaction on Solscan
                </a>
              )}

              <div className="mt-6">
                <Button
                  onClick={() => setModal({ open: false })}
                  className="bg-blue-600 hover:bg-blue-700 w-full text-white py-2 rounded-xl"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}