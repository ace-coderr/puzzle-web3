"use client";
import { useEffect, useState } from "react";

interface Bid {
    id: number;
    amount: number;
    txSignature?: string | null;
    status: "PENDING" | "SUCCESS" | "FAILED";
    createdAt: string;
    user: { walletAddress: string };
}

export default function RecentActivity() {
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBids = async () => {
            try {
                const res = await fetch("/api/bids");
                if (res.ok) {
                    const data = await res.json();
                    setBids(data);
                }
            } catch (error) {
                console.error("Failed to fetch bids:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBids();
    }, []);

    if (loading) return <p className="text-wcenter text-white">Loading recents....</p>

    return (
        <div className="mt-8 max-w-2xl mx-auto bg-gray-900 text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
            {bids.length === 0 ? (
                <p className="text-gray-400">No recent bids yet.</p>
            ) : (
                <ul className="space-y-3">
                    {bids.map((bid) => (
                        <li
                            key={bid.id}
                            className="flex justify-between items-center border-b border-gray-700 pb-2"
                        >
                            <div>
                                <p className="font-mono text-sm">
                                    {bid.user.walletAddress.slice(0, 4)}...
                                    {bid.user.walletAddress.slice(-4)}
                                </p>
                                <p className="text-xs text-gray-400">{new Date(bid.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">{bid.amount} SOL</p>
                                <p
                                    className={`text-xs ${bid.status === "SUCCESS"
                                            ? "text-green-400"
                                            : bid.status === "FAILED"
                                                ? "text-red-400"
                                                : "text-yellow-400"
                                        }`}
                                >
                                    {bid.status}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}