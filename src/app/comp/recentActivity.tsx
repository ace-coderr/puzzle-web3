"use client";

import { useEffect, useState } from "react";

export default function RecentActivity() {
    const [bids, setBids] = useState<any[]>([]);

    const fetchRecentBids = async () => {
        try {
            const res = await fetch("/api/bids");
            if (!res.ok) throw new Error("Failed to fetch bids");
            const data = await res.json();
            setBids(data);
        } catch (err) {
            console.error("Error loading bids:", err);
        }
    };

    useEffect(() => {
        fetchRecentBids();
        const refreshHandler = () => fetchRecentBids();
        document.addEventListener("recent-activity-refresh", refreshHandler);
        return () => document.removeEventListener("recent-activity-refresh", refreshHandler);
    }, []);

    return (
        <div className="bg-gray-900 text-white rounded-xl p-4 shadow-lg w-full max-w-sm">
            <h2 className="text-center font-bold mb-3">Recent Activity</h2>
            {bids.length === 0 ? (
                <p className="text-gray-400 text-center">No recent bids yet.</p>
            ) : (
                <ul className="space-y-3">
                    {bids.map((bid) => (
                        <li
                            key={bid.id}
                            className="border border-gray-700 p-3 rounded-lg bg-gray-800"
                        >
                            <p>💰 <strong>{Number(bid.amount)} SOL</strong></p>
                            <p>Status: <span className={bid.status === "SUCCESS" ? "text-green-400" : "text-red-400"}>{bid.status}</span></p>

                            {/* ✅ Add Solana Explorer link here */}
                            {bid.transactions?.[0]?.txSignature && (
                                <a
                                    href={`https://explorer.solana.com/tx/${bid.transactions[0].txSignature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 underline text-sm"
                                >
                                    View on Solana Explorer
                                </a>
                            )}

                            <p className="text-xs text-gray-400">
                                {new Date(bid.createdAt).toLocaleString()}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}