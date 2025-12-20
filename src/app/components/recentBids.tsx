"use client";

import { useEffect, useState, useCallback, memo } from "react";

type Bid = {
    id: string;
    wallet: string;
    amount: number;
    createdAt: string;
    gameId: string;
};

function RecentActivity() {
    console.log("🔄 RecentActivity render");

    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBids = useCallback(async () => {
        try {
            const res = await fetch("/api/bids");
            const data = await res.json();
            setBids(Array.isArray(data) ? data : data.bids || []);
        } catch {
            console.error("Failed to load recent bids");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBids();
        document.addEventListener("recent-bid", fetchBids);
        return () =>
            document.removeEventListener("recent-bid", fetchBids);
    }, [fetchBids]);

    const formatRelativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins} mins ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hours ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    if (loading) {
        return (
            <div className="recent-bids-section">
                <p className="text-center text-gray-400">
                    Loading activity...
                </p>
            </div>
        );
    }

    return (
        <div className="recent-bids-section">
            <h2 className="text-xl font-bold text-center mb-4 text-emerald-400">
                Recent Activity
            </h2>
            <hr className="hr" />

            {bids.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                    No bids yet.
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
                            <span className="text-gray-500 text-xs">
                                {formatRelativeTime(bid.createdAt)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default memo(RecentActivity);