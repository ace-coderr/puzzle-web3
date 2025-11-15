"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!);

type Reward = {
  id: string;
  title: string;
  description: string | null;
  amount: string;
};

export default function RewardPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; amount?: string; tx?: string }>({ open: false });

  useEffect(() => {
    if (!publicKey) return;
    fetchRewards();
  }, [publicKey]);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rewards?walletAddress=${publicKey!.toString()}`);
      const data = await res.json();
      setRewards(data.rewards || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (reward: Reward) => {
    setClaiming(true);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: reward.id,
          walletAddress: publicKey!.toString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Claimed ${data.amount} SOL! Tx: ${data.txSignature}`);
      setModal({ open: true, amount: data.amount, tx: data.txSignature });
      setRewards(prev => prev.filter(r => r.id !== reward.id));
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!publicKey) return <div className="flex justify-center items-center min-h-screen text-gray-300">Connect wallet</div>;
  if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-300">Loading...</div>;
  if (rewards.length === 0)
    return (
      <main className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white p-6">
        <h1 className="text-2xl font-bold mb-4">No Rewards Yet</h1>
        <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700">
          Play Now
        </Button>
      </main>
    );

  return (
    <main className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white px-6">
      <div className="w-full max-w-md space-y-6">
        {rewards.map(reward => (
          <div key={reward.id} className="bg-gray-900 p-8 rounded-2xl shadow-lg text-center border border-gray-800">
            <h1 className="text-2xl font-bold mb-2 text-blue-400">{reward.title}</h1>
            <p className="text-gray-400 mb-6">{reward.description || ""}</p>
            <div className="text-3xl font-semibold text-green-400 mb-8">{parseFloat(reward.amount)} SOL</div>
            <Button
              onClick={() => handleClaim(reward)}
              disabled={claiming}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {claiming ? "Confirm in Wallet..." : "Claim Reward"}
            </Button>
          </div>
        ))}
        <Button onClick={() => router.push("/")} className="w-full bg-gray-700 hover:bg-gray-600">
          Play Again
        </Button>
      </div>

      <AnimatePresence>
        {modal.open && (
          <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-gray-900 rounded-2xl p-8 text-center shadow-2xl border border-gray-700 w-[90%] max-w-md" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <div className="bg-green-600 w-14 h-14 flex items-center justify-center rounded-full mx-auto mb-4">Check</div>
              <h2 className="text-2xl font-bold mb-3 text-green-400">Claimed!</h2>
              <p className="text-gray-400 mb-5">{modal.amount} SOL is yours!</p>
              <Button onClick={() => setModal({ open: false })} className="mt-6 bg-blue-600 hover:bg-blue-700 w-full">
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}