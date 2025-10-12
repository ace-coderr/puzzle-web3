import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const bids = await prisma.bid.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { walletAddress: true } },
          gameResult: { select: { gameId: true, won: true } },
          transactions: { select: { status: true, amount: true } },
        },
      });
      return res.status(200).json(bids);
    }

    if (req.method === "POST") {
      const { walletAddress, amount, status } = req.body;

      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1️⃣ Find or create the user
      let user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress,
            customId: Math.floor(Math.random() * 1000000),
          },
        });
      }

      // 2️⃣ Create a gameResult for this bid
      const gameResult = await prisma.gameResult.create({
        data: {
          gameId: `game_${Date.now()}_${user.id}`,
          score: 0,
          moves: 0,
          bidding: new Prisma.Decimal(amount),
          won: false,
          userId: user.id,
        },
      });

      // 3️⃣ Create the bid + linked transaction
      const newBid = await prisma.bid.create({
        data: {
          amount: new Prisma.Decimal(amount),
          status: (status as "PENDING" | "SUCCESS" | "FAILED") || "PENDING",
          userId: user.id,
          gameResultId: gameResult.id,
          transactions: {
            create: [
              {
                amount: new Prisma.Decimal(amount),
                type: "BID",
                status: (status as "PENDING" | "SUCCESS" | "FAILED") || "PENDING",
                userId: user.id,
              },
            ],
          },
        },
        include: { transactions: true, gameResult: true },
      });

      // ✅ Important: send a response
      return res.status(201).json({
        message: "Bid created successfully",
        bid: newBid,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("❌ Error in /api/bids:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}