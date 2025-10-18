"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";

type Reward = {
  id: string;
  title: string;
  description: string;
  amount: number;
  claimed: boolean;
};

export default function RewardPage() {
  const router = useRouter();
  const wallet = useWallet();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 🔹 Fetch rewards when wallet connects
  useEffect(() => {
    if (!wallet.publicKey) return;

    const walletAddress = wallet.publicKey.toBase58();
    const fetchRewards = async () => {
      try {
        const res = await fetch(`/api/rewards?wallet=${walletAddress}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load rewards");
        setRewards(data.rewards || []);
      } catch (err) {
        console.error("❌ Error loading rewards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [wallet.publicKey]);


  // 🔹 Handle reward claim
  const handleClaim = async (reward: Reward) => {
    if (!wallet.publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    setLoadingId(reward.id);

    try {
      // Notify backend (simulate claim)
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toString(),
          rewardId: reward.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reward claim failed.");

      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, claimed: true } : r))
      );

      alert(`✅ ${reward.title} claimed! ${reward.amount} SOL sent to your wallet.`);
    } catch (err: any) {
      console.error("❌ Claim error:", err);
      alert(`Failed to claim reward: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white text-lg">
        Loading your rewards...
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center py-10 px-6 bg-gray-950 min-h-screen text-white">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-center mb-4">🏆 Claim Your Reward</h1>
        <p className="text-center text-gray-400 mb-8">
          Congratulations on your win! Claim your available rewards below.
        </p>

        {!wallet.publicKey ? (
          <div className="text-center text-gray-500 mt-10">
            Please connect your wallet to view rewards.
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            No available rewards yet. Keep playing to earn some!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`p-5 rounded-2xl shadow-md transition ${reward.claimed
                    ? "bg-gray-800 opacity-70"
                    : "bg-gray-900 hover:bg-gray-800"
                  }`}
              >
                <h3 className="text-xl font-bold mb-2">{reward.title}</h3>
                <p className="text-gray-400 mb-3">{reward.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-400">
                    {reward.amount} SOL
                  </span>

                  <Button
                    disabled={reward.claimed || loadingId === reward.id}
                    onClick={() => handleClaim(reward)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    {reward.claimed
                      ? "Claimed"
                      : loadingId === reward.id
                        ? "Claiming..."
                        : "Claim"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-700 hover:bg-gray-600 px-6 py-3 text-white rounded-xl"
          >
            🔁 Play Again
          </Button>
        </div>
      </div>
    </main>
  );
}