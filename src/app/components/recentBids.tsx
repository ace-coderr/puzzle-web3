"use client";
import { useEffect, useState, useCallback, memo } from "react";

type Bid = {
  id: string;
  wallet: string;
  amount: number;
  createdAt: string;
  gameId: string;
  txSignature?: string;
  network?: "devnet";
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
      <h2 className="section-title">Recent Activity</h2>
      <hr className="hr" />
      {bids.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No bids yet.</p>
      ) : (
        <div className="bids-list">
          {/* Header Row */}
          <div className="bid-header">
            <span className="header-text">Wallet</span>
            <span className="header-text">Amount</span>
            <span className="header-text">Date</span>
            <span className="header-text">Status</span>
          </div>
          {bids.map((bid) => (
            <div
              key={bid.id}
              className="bid-row"
            >
              {/* WALLET */}
              <div className="flex items-center gap-2">
                <span title={bid.wallet} className="wallet-text">
                  {shortenAddress(bid.wallet)}
                </span>
                {bid.txSignature && (
                  <a
                    href={`https://orb.helius.xyz/tx/${bid.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on Helius ORB (Devnet)"
                    className="tx-link"
                  >
                    <img
                      src="/images/arrow-link.png"
                      alt="Open in explorer"
                      className="link-icon"
                    />
                  </a>
                )}
              </div>
              {/* AMOUNT */}
              <span className="amount-text">{+bid.amount.toFixed(4)} SOL</span>
              {/* DATE */}
              <span className="time-text">{formatRelativeTime(bid.createdAt)}</span>
              {/* STATUS */}
              <div className="flex items-center gap-1.5">
                <img
                  src="/images/check.png"
                  alt="Success"
                  className="w-4 h-4"
                />
                <span className="status-text">Success</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(RecentActivity);