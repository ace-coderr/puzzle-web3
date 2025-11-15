"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import Modal from "./Modal";

type Reward = {
  id: string;
  title: string;
  description: string | null;
  amount: string;
};

export default function RewardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    amount?: string;
    tx?: string;
  }>({ open: false });

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
      console.error("Failed to load rewards:", err);
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

      setModal({
        open: true,
        amount: data.amount,
        tx: data.txSignature,
      });

      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!publicKey)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-300">
        Connect wallet to view rewards.
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
      <main className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white p-6">
        <h1 className="text-2xl font-bold mb-4">No Rewards Yet</h1>
        <p className="text-gray-400 mb-6 text-center max-w-xs">
          Place a bid and win a puzzle to earn SOL!
        </p>
        <Button
          onClick={() => router.push("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
        >
          Play Now
        </Button>
      </main>
    );

  return (
    <main className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white px-6">
      <div className="w-full max-w-md space-y-6">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="bg-gray-900 p-8 rounded-2xl shadow-lg text-center border border-gray-800"
          >
            <h1 className="text-2xl font-bold mb-2 text-blue-400">{reward.title}</h1>
            <p className="text-gray-400 mb-6">{reward.description || ""}</p>
            <div className="text-3xl font-semibold text-green-400 mb-8">
              {parseFloat(reward.amount)} SOL
            </div>
            <Button
              onClick={() => handleClaim(reward)}
              disabled={claiming}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
            >
              {claiming ? "Processing..." : "Claim Reward"}
            </Button>
          </div>
        ))}

        <div className="text-center mt-6">
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl"
          >
            Play Again
          </Button>
        </div>
      </div>

      {/* REUSABLE MODAL — NO DUPLICATE */}
      <Modal
        title="Reward Claimed!"
        show={modal.open}
        onClose={() => setModal({ open: false })}
        singleButton={true}
        variant="success"
      >
        <p className="text-3xl font-bold text-white mb-2">{modal.amount} SOL</p>
        <p className="text-xs text-gray-400 break-all mb-3">{modal.tx}</p>
        <a
          href={`https://explorer.solana.com/tx/${modal.tx}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline text-sm hover:text-blue-300"
        >
          View on Solana Explorer
        </a>
      </Modal>
    </main>
  );
}