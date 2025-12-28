"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

type LeaderboardEntry = {
    rank: number;
    wallet: string;
    wins: number;
    totalBid: number;
};

export default function LeaderboardPage() {
    const { publicKey, connected } = useWallet();
    const router = useRouter();

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        if (!connected) {
            router.push("/");
            return;
        }

        fetch("/api/leaderboard", {
            headers: {
                "x-wallet-address": publicKey!.toBase58(),
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setLeaderboard(data.leaderboard || []);
            });
    }, [connected, publicKey, router]);

    return (
        <main className="lb-page">
            <div className="lb-container">

                <h1 className="lb-title">Leaderboard</h1>

                {/* HEADER */}
                <div className="lb-header">
                    <div>Rank</div>
                    <div>Address</div>
                    <div>Wins</div>
                    <div>Sol</div>
                </div>

                {/* LEADERBOARD LIST */}
                <div className="lb-list">
                    {leaderboard.map((entry, idx) => (
                        <div
                            key={entry.rank}
                            className={`lb-row ${idx < 3 ? "top" : ""}`}
                        >
                            <div className="rank">
                                {idx < 3 ? "👑" : entry.rank}
                            </div>
                            <div className="address">{entry.wallet}</div>
                            <div className="wins">{entry.wins}</div>
                            <div className="sol">${entry.totalBid.toFixed(2)}</div>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}