import {useState, useEffect, useRef} from 'react';


interface BidComponentProps {
    onBid: (amount: number) => Promise<void>;
}

export default function BidComponent({ onBid }: BidComponentProps) {
    const [bidAmount, setBidAmount] = useState(0.01);
    const [loading, setLoading] = useState(false);

    const quickAmounts = [0.0001, 0.01, 1, 2];

    const handleBidClick = async () => {
        setLoading(true);
        try {
            await onBid(bidAmount);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center bg-gray-900 text-white">
            <div className="bg-white border border-pink-500 rounded-xl p-6 shadow-lg text-black space-y-6 w-full max-w-md">
                <h2 className="text-center text-xl font-bold">Place Your Bid</h2>

                <div>
                    <label className="block mb-1 text-sm text-gray-700">
                        Bid Amount (SOL)
                    </label>
                    <input
                        type="number"
                        step="0.0001"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded bg-gray-800 border border-pink-500 text-white focus:outline-none focus:ring focus:ring-pink-400"
                    />
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    {quickAmounts.map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setBidAmount(amt)}
                            className={`px-4 py-2 border border-pink-500 rounded hover:bg-pink-500 ${bidAmount === amt ? "bg-pink-500 text-white" : ""
                                }`}
                        >
                            {amt} SOL
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleBidClick}
                    disabled={loading}
                    className="w-full py-2 bg-green-500 rounded-lg font-bold text-black disabled:opacity-50"
                >
                    {loading ? "Processing..." : "PLAY"}
                </button>
            </div>
        </div>
    );
}
