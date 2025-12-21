"use client";

import { useEffect, useState, useCallback, memo } from "react";

type Bid = {
    id: string;
    wallet: string;
    amount: number;
    createdAt: string;
    gameId: string;
    txSignature?: string;
};

function RecentActivity() {
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBids = useCallback(async () => {
        try {
            const res = await fetch("/api/bids");
            const data = await res.json();
            setBids(Array.isArray(data) ? data : data.bids || []);
        } catch (err) {
            console.error("Failed to load recent bids", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBids();
        document.addEventListener("recent-bid", fetchBids);
        return () => document.removeEventListener("recent-bid", fetchBids);
    }, [fetchBids]);

    const formatRelativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins} minutes ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hours ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    const shortenAddress = (addr: string) =>
        `${addr.slice(0, 4)}...${addr.slice(-4)}`;

    if (loading) {
        return (
            <div className="recent-bids-section">
                <p className="text-center text-gray-400">Loading activity...</p>
            </div>
        );
    }

    return (
        <div className="recent-bids-section">
            <h2 className="text-xl font-bold text-center mb-4 text-emerald-400">
                Recent Activity
            </h2>

            <hr className="hr" />

            {/* COLUMN HEADERS */}
            <div className="grid grid-cols-4 text-gray-400 text-sm px-2 mb-3">
                <span>Wallet</span>
                <span>Amount</span>
                <span>Date</span>
                <span>Status</span>
            </div>

            {bids.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No bids yet.</p>
            ) : (
                <div className="space-y-2">
                    {bids.map((bid) => (
                        <div
                            key={bid.id}
                            className="grid grid-cols-4 items-center px-2 py-2 rounded transition"
                        >
                            {/* WALLET */}
                            <div className="flex items-center gap-1.5 group">
                                <a
                                    href={
                                        bid.txSignature
                                            ? `https://solscan.io/tx/${bid.txSignature}?cluster=devnet`
                                            : `https://solscan.io/account/${bid.wallet}?cluster=devnet`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={bid.wallet}
                                    className="text-blue-400 hover:underline inline-flex items-center"
                                >
                                    {shortenAddress(bid.wallet)}
                                    <img
                                        src="/images/arrow-link.png"
                                        alt=""
                                        className="w-3 h-3 opacity-80 transition-all duration-200 ease-out group-hover:translate-x-1 group-hover:opacity-100 pointer-events-none invert"
                                    />
                                </a>
                            </div>

                            {/* AMOUNT */}
                            <span className="text-emerald-400 font-bold">
                                {parseFloat(bid.amount.toFixed(4))} SOL
                            </span>

                            {/* DATE */}
                            <span className="text-gray-500 text-xs">
                                {formatRelativeTime(bid.createdAt)}
                            </span>

                            {/* STATUS */}
                            <div className="flex items-center gap-1.5">
                                <img
                                    src="/images/check.png"
                                    alt="Success"
                                    className="w-4 h-4"
                                />
                                <span className="text-green-500 text-sm font-medium">
                                    Success
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default memo(RecentActivity);
