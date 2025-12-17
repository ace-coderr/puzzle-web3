"use client";

import { useEffect, useState, memo } from "react";

type Bid = {
    id: string;
    wallet: string;
    amount: number;
    date: string;
};

function RecentActivity() {
    console.log("🔄 RecentActivity render"); // for debugging

    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBids = async () => {
        try {
            const res = await fetch("/api/bids");
            if (!res.ok) throw new Error();
            const data = await res.json();
            setBids(Array.isArray(data) ? data : data.bids || []);
        } catch {
            console.error("Failed to load recent bids");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBids();

        const handler = () => fetchBids();
        document.addEventListener("recent-bid", handler);

        return () => document.removeEventListener("recent-bid", handler);
    }, []);

    if (loading) {
        return (
            <div className="bg-gray-900/90 rounded-2xl p-6 border border-gray-800 w-full max-w-md">
                <p className="text-center text-gray-400">Loading activity...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/90 rounded-2xl p-6 border border-gray-800 w-full max-w-md">
            <h2 className="text-xl font-bold text-center mb-4 text-emerald-400">
                Recent Activity
            </h2>

            <div className="bg-black/40 rounded-xl p-4 font-mono text-sm">
                {bids.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                        No bids yet. Be the first!
                    </p>
                ) : (
                    <div className="space-y-3">
                        {bids.map((bid) => (
                            <div
                                key={bid.id}
                                className="flex justify-between text-gray-300"
                            >
                                <span>{bid.wallet}</span>
                                <span className="text-emerald-400 font-bold">
                                    {bid.amount} SOL
                                </span>
                                <span className="text-gray-500 text-xs">{bid.date}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/** 👇 THIS is the important line */
export default memo(RecentActivity);