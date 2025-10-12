"use client";
import { useEffect, useState } from "react";

export default function RewardsPage() {
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/game-results")
            .then(res => res.json())
            .then(setGames)
            .catch(console.error);
    }, []);

    const handleClaim = async (gameId: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/claim-reward", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            alert(data.message || "Reward claimed");
            setGames(prev => prev.map(g => g.gameId === gameId ? { ...g, claimed: true } : g));
        } catch {
            alert("Failed to claim reward");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">🎁 Your Rewards</h1>
            <div className="space-y-4">
                {games.map((g) => (
                    <div key={g.gameId} className="bg-gray-800 p-4 rounded-lg flex justify-between">
                        <div>
                            <p>Game ID: {g.gameId}</p>
                            <p>Status: {g.won ? "🏆 Win" : "💀 Lose"}</p>
                            <p>Bid: {g.bidding} SOL</p>
                            <p>Moves: {g.moves}</p>
                            <p>Time: {g.score}s</p>
                        </div>
                        {g.won && !g.claimed ? (
                            <button
                                onClick={() => handleClaim(g.gameId)}
                                disabled={loading}
                                className="bg-green-500 text-black font-bold px-4 py-2 rounded"
                            >
                                {loading ? "Processing..." : "Claim"}
                            </button>
                        ) : g.claimed ? (
                            <span className="text-gray-400">✅ Claimed</span>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
