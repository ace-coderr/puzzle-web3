"use client";

import { useEffect, useRef, useState } from "react";
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
    const myRowRef = useRef<HTMLDivElement | null>(null);
    const topRef = useRef<HTMLDivElement | null>(null);

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

    const scrollToMyRank = () => {
        myRowRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    };

    const scrollToTop = () => {
        topRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    return (
        <main className="lb-page">
            <div className="lb-container" ref={topRef}>
                <h1 className="lb-title">Leaderboard</h1>

                {/* HEADER */}
                <div className="lb-header">
                    <div>Rank</div>
                    <div>Address</div>
                    <div>Wins</div>
                    <div>Sol</div>
                </div>

                {/* LIST */}
                <div className="lb-list">
                    {leaderboard.map((entry, idx) => {
                        const isMe = entry.wallet === publicKey?.toBase58();

                        return (
                            <div
                                key={entry.rank}
                                ref={isMe ? myRowRef : null}
                                className={`lb-row ${idx < 3 ? "top" : ""} ${isMe ? "me" : ""}`}
                            >
                                <div className={`rank ${idx < 3 ? "top-rank" : "normal-rank"}`}>
                                    <span className="rank-content">
                                        <img
                                            src={idx < 3 ? "/images/crown.png" : "/images/user.png"}
                                            alt={idx < 3 ? "Crown" : "User"}
                                            className={idx < 3 ? "crown-icon" : "user-icon"}
                                        />
                                        {entry.rank}
                                    </span>
                                </div>

                                <div className="address">{entry.wallet}</div>
                                <div className="wins">{entry.wins}</div>
                                <div className="sol">${Number(entry.totalBid.toFixed(2)).toString()}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* FLOATING ACTION BUTTONS */}
            <div className="lb-fab">
                <button onClick={scrollToMyRank}>my rank</button>
                <button onClick={scrollToTop}>top</button>
            </div>
        </main>
    );
}