"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import Modal from "../comp/Modal";

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
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; amount?: string; tx?: string }>({ open: false });

  useEffect(() => {
    if (!publicKey) return;
    fetchHistory();
  }, [publicKey]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/game-results?walletAddress=${publicKey!.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (result: GameResult) => {
    if (!result.reward || result.claimed) return;
    setClaiming(result.id);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameResultId: result.id,
          walletAddress: publicKey!.toString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setModal({ open: true, amount: data.amount, tx: data.txSignature });
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, claimed: true } : r));
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaiming(null);
    }
  };

  if (!publicKey) return <div className="flex justify-center items-center min-h-screen text-gray-300">Connect wallet to view rewards.</div>;
  if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-300">Loading history...</div>;

  const unclaimed = results.filter(r => r.won && r.reward && !r.claimed);
  const history = results.filter(r => r.claimed || !r.won);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {unclaimed.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-green-400">Unclaimed Rewards</h2>
            <div className="space-y-4">
              {unclaimed.map(r => (
                <div key={r.id} className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-green-400">{r.reward!.toFixed(2)} SOL</p>
                    <p className="text-sm text-gray-400">
                      Won in {r.moves} moves, {r.time}s • {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleClaim(r)}
                    disabled={claiming === r.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
                  >
                    {claiming === r.id ? "Claiming..." : "Claim"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4">Game History</h2>
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No games played yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map(r => (
                <div
                  key={r.id}
                  className={`p-4 rounded-lg border ${r.won ? "bg-green-900/20 border-green-700" : "bg-red-900/20 border-red-700"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-semibold ${r.won ? "text-green-400" : "text-red-400"}`}>
                        {r.won ? "WIN" : "LOSE"}
                      </p>
                      <p className="text-sm text-gray-300">
                        {r.moves} moves • {r.time}s • Bid: {r.bidding} SOL
                      </p>
                      {r.won && r.reward && (
                        <p className="text-xs text-gray-400">
                          Reward: {r.reward.toFixed(2)} SOL {r.claimed ? "• Claimed" : ""}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="text-center pt-6">
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl"
          >
            Play Again
          </Button>
        </div>
      </div>

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