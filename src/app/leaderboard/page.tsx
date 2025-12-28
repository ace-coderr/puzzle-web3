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

        {/* ACTION BUTTONS */}
        <div className="lb-actions">
          <button onClick={scrollToMyRank}>Go to My Rank</button>
          <button onClick={scrollToTop}>Back to Top</button>
        </div>

        {/* HEADER */}
        <div className="lb-header">
          <div>Rank</div>
          <div>Address</div>
          <div>Wins</div>
          <div>Sol</div>
        </div>

        {/* LEADERBOARD LIST */}
        <div className="lb-list">
          {leaderboard.map((entry, idx) => {
            const isMe = entry.wallet === publicKey?.toBase58();

            return (
              <div
                key={entry.rank}
                ref={isMe ? myRowRef : null}
                className={`lb-row ${idx < 3 ? "top" : ""} ${isMe ? "me" : ""}`}
              >
                <div className="rank">
                  {idx < 3 ? "👑" : entry.rank}
                </div>
                <div className="address">{entry.wallet}</div>
                <div className="wins">{entry.wins}</div>
                <div className="sol">${entry.totalBid.toFixed(2)}</div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}