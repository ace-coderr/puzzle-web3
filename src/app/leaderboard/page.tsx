"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

type LeaderboardEntry = {
    rank: number;
    wallet: string;
    wins: number;
    totalBid: number;
    isMe?: boolean;
};

export default function LeaderboardPage() {
    const { publicKey, connected } = useWallet();
    const router = useRouter();
    const [data, setData] = useState<{ leaderboard: LeaderboardEntry[]; myRank: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = async () => {
        if (!publicKey) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/leaderboard", {
                headers: { "x-wallet-address": publicKey.toBase58() },
            });
            if (!res.ok) throw new Error("Failed");
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!connected) {
            router.push("/");
        } else {
            fetchLeaderboard();
        }
    }, [connected, publicKey, router]);

    if (!connected || loading || error || !data) {
        return null;
    }

    const { leaderboard, myRank } = data;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white pt-20">
            <main className="max-w-4xl mx-auto p-6 space-y-8">
                <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                    Leaderboard
                </h1>

                {myRank && (
                    <div className="bg-gradient-to-r from-purple-900/60 via-pink-900/60 to-purple-900/60 p-6 rounded-2xl border border-purple-600 shadow-2xl backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="text-3xl font-black text-yellow-400">#{myRank.rank} (You)</p>
                                <p className="font-mono text-xl text-purple-200">{myRank.wallet}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-400">{myRank.wins} Wins</p>
                                <p className="text-sm text-gray-300">{myRank.totalBid.toFixed(3)} SOL</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {leaderboard.map((entry, idx) => (
                        <div
                            key={entry.rank}
                            className={`p-5 rounded-xl border backdrop-blur-sm ${entry.isMe
                                    ? "bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-yellow-600"
                                    : "bg-slate-800/60 border-slate-700"
                                } ${idx < 3 ? "ring-2 ring-purple-500" : ""}`}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className={`text-2xl font-bold ${idx < 3 ? "text-yellow-400" : "text-purple-400"}`}>
                                        #{entry.rank}
                                    </span>
                                    <span className="font-mono text-lg text-gray-200">{entry.wallet}</span>
                                    {entry.isMe && <span className="bg-yellow-600 text-black px-3 py-1 rounded-full text-xs font-bold">YOU</span>}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-400">{entry.wins} Wins</p>
                                    <p className="text-sm text-gray-400">{entry.totalBid.toFixed(3)} SOL</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}