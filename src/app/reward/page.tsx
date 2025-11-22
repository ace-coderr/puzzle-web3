"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import Modal from "../components/modal";
import { useGameSounds } from "@/hooks/useGameSounds";
import confetti from "canvas-confetti";

type GameResult = {
  id: string;
  won: boolean;
  moves: number;
  time: number;
  bidding: number;
  reward?: number;
  claimed: boolean;
  difficulty: string;
  createdAt: string;
};

export default function RewardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { playClaim } = useGameSounds();

  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    amount?: string;
    tx?: string;
  }>({ open: false });

  useEffect(() => {
    if (!publicKey) return;
    fetchHistory();
  }, [publicKey]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/game-results?walletAddress=${publicKey!.toBase58()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (gameId: string) => {
    if (!publicKey) {
      alert("Wallet not connected!");
      return;
    }
    setClaiming(gameId);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          walletAddress: publicKey.toBase58(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");

      // CONFETTI + SOUND + SUCCESS
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
      });

      playClaim();

      setModal({ open: true, amount: data.amount, tx: data.txSignature });
      fetchHistory();
    } catch (err: any) {
      alert("Claim failed: " + err.message);
    } finally {
      setClaiming(null);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300 text-lg font-medium">
        Connect wallet to view rewards.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300 text-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500 mr-3"></div>
        Loading history...
      </div>
    );
  }

  // FILTERS
  const unclaimed = results.filter((r) => r.won && r.reward && !r.claimed);
  const wins = results.filter((r) => r.won && r.claimed);
  const losses = results.filter((r) => !r.won);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-12">

        {/* 1. UNCLAIMED REWARDS */}
        {unclaimed.length > 0 && (
          <section className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 p-6 rounded-2xl border border-emerald-700/50 shadow-xl">
            <h2 className="text-2xl font-bold mb-5 text-emerald-400">
              Unclaimed Rewards ({unclaimed.length})
            </h2>
            <div className="space-y-4">
              {unclaimed.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-800/80 p-5 rounded-xl border border-emerald-600/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-sm"
                >
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-emerald-400">
                      {r.reward!.toString().replace(/\.?0+$/, '')} SOL
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      Won in <span className="font-mono">{r.moves}</span> moves • {r.time}s • {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-emerald-300 mt-1">
                      {r.difficulty.toUpperCase()} MODE
                    </p>
                  </div>
                  <Button
                    onClick={() => handleClaim(r.id)}
                    disabled={claiming === r.id}
                    className={`min-w-[120px] font-bold transition-all ${claiming === r.id
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:scale-105"
                      }`}
                  >
                    {claiming === r.id ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                        Claiming...
                      </>
                    ) : (
                      "Claim"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. WINS (Claimed) */}
        <section>
          <h2 className="text-2xl font-bold mb-5 text-emerald-400">
            Wins ({wins.length})
          </h2>
          {wins.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700 text-gray-400">
              No wins claimed yet. Keep playing!
            </div>
          ) : (
            <div className="space-y-3">
              {wins.map((r) => (
                <div key={r.id} className="p-5 rounded-xl border bg-emerald-900/30 border-emerald-700/50 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xl font-bold text-emerald-400">WIN</p>
                      <p className="text-sm text-gray-300 mt-1">
                        <span className="font-mono">{r.moves}</span> moves • {r.time}s • Bid: {r.bidding.toString().replace(/\.?0+$/, '')} SOL
                      </p>
                      <p className="text-xs text-emerald-300 mt-1">
                        Reward: {r.reward!.toString().replace(/\.?0+$/, '')} SOL • Claimed
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. LOSSES */}
        <section>
          <h2 className="text-2xl font-bold mb-5 text-red-400">
            Losses ({losses.length})
          </h2>
          {losses.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700 text-gray-400">
              No losses yet. You're unstoppable!
            </div>
          ) : (
            <div className="space-y-3">
              {losses.map((r) => (
                <div key={r.id} className="p-5 rounded-xl border bg-red-900/30 border-red-700/50 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xl font-bold text-red-400">LOSE</p>
                      <p className="text-sm text-gray-300 mt-1">
                        <span className="font-mono">{r.moves}</span> moves • {r.time}s • Bid: {r.bidding.toString().replace(/\.?0+$/, '')} SOL
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Empty State - No Games */}
        {results.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-6">No games played yet.</p>
            <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700">
              Play Now
            </Button>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <Modal
        title="Reward Claimed!"
        show={modal.open}
        onClose={() => {
          setModal({ open: false });
          fetchHistory();
        }}
        variant="success"
        hideFooter={true}
      >
        <div className="text-center py-8 space-y-6">
          <p className="text-5xl font-black text-emerald-400">
            +{modal.amount} SOL
          </p>
          <p className="text-xs font-mono text-gray-400 break-all max-w-xs mx-auto">
            {modal.tx}
          </p>
          <a
            href={`https://solana.fm/tx/${modal.tx}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-lg"
          >
            View on Solana.fm (Devnet)
          </a>
        </div>
      </Modal>
    </main>
  );
}