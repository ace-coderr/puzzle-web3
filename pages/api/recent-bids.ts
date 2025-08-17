import type { NextApiRequest, NextApiResponse } from "next";

// Mock DB (replace with real database)
let bids: {
    id: number;
    walletAddress: string;
    amount: number;
    createdAt: string;
}[] = [
        { id: 1, walletAddress: "Fv3...abc1", amount: 0.01, createdAt: new Date().toISOString() },
        { id: 2, walletAddress: "Hw8...xyz9", amount: 1.5, createdAt: new Date().toISOString() },
    ];

// GET /api/recent-bids → fetch last 10 bids
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        return res.status(200).json(bids.slice(-10).reverse());
    }

    if (req.method === "POST") {
        const { walletAddress, amount } = req.body;
        if (!walletAddress || !amount) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const newBid = {
            id: bids.length + 1,
            walletAddress,
            amount,
            createdAt: new Date().toISOString(),
        };

        bids.push(newBid);
        return res.status(201).json(newBid);
    }

    return res.status(405).json({ error: "Method not allowed" });
}