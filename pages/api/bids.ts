import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma, BidStatus, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Handle GET — recent activity
    if (req.method === "GET") {
      const bids = await prisma.bid.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: true },
      });

      return res.status(200).json(bids);
    }

    // ✅ Handle POST — place new bid
    if (req.method === "POST") {
      const { walletAddress, amount, status, txSignature } = req.body;

      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1️⃣ Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress,
            customId: Math.floor(Math.random() * 1_000_000),
          },
        });
      }

      // 2️⃣ Create new game result (linked to bid)
      const gameResult = await prisma.gameResult.create({
        data: {
          gameId: `game_${Date.now()}_${user.id}`,
          userId: user.id,
          score: 0,
          moves: 0,
          bidding: new Prisma.Decimal(amount),
          won: false,
        },
      });

      // 3️⃣ Create bid + transaction
      const bid = await prisma.bid.create({
        data: {
          amount: new Prisma.Decimal(amount),
          status: (status as BidStatus) || "PENDING",
          userId: user.id,
          gameResultId: gameResult.id,
          transactions: {
            create: [
              {
                amount: new Prisma.Decimal(amount),
                type: "BID",
                status: (status === "SUCCESS" ? "SUCCESS" : "FAILED") as TransactionStatus,
                userId: user.id,
                txSignature: txSignature || null,
              },
            ],
          },
        },
        include: {
          transactions: true,
          gameResult: true,
        },
      });

      // 4️⃣ Generate puzzle image
      const randomSeed = Math.floor(Math.random() * 1000);
      const imageUrl = `https://picsum.photos/seed/${randomSeed}/800/480`;

      // 5️⃣ Respond
      return res.status(201).json({
        message: "✅ Bid successful — game starting!",
        imageUrl,
        startTime: Date.now(),
        bid,
      });
    }

    // ❌ If not GET or POST
    return res.status(405).json({ error: "Method not allowed" });

  } catch (error: any) {
    console.error("❌ Error in /api/bids:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}