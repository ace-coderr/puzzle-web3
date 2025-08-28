import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // Fetch recent bids
      const bids = await prisma.bid.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { walletAddress: true } },
          gameResult: { select: { gameId: true, won: true } },
        },
      });
      return res.status(200).json(bids);
    }

    if (req.method === "POST") {
      const { walletAddress, amount, status } = req.body;

      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // 1. Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress,
            customId: Math.floor(Math.random() * 1000000), // ensure customId
          },
        });
      }

      // 2. Create a new gameResult for this bid (one bid per game)
      const gameResult = await prisma.gameResult.create({
        data: {
          gameId: `game_${Date.now()}_${user.id}`, // unique ID
          score: 0,
          moves: 0,
          bidding: new Prisma.Decimal(amount),
          won: false,
          userId: user.id,
        },
      });

      // 3. Create a transaction for the bid
      const transaction = await prisma.transaction.create({
        data: {
          amount: new Prisma.Decimal(amount),
          type: "BID",
          status: (status as "PENDING" | "SUCCESS" | "FAILED") || "PENDING",
          userId: user.id,
        },
      });

      // 4. Create the bid (link gameResult + transaction)
      const newBid = await prisma.bid.create({
        data: {
          amount: new Prisma.Decimal(amount),
          status: (status as "PENDING" | "SUCCESS" | "FAILED") || "PENDING",
          userId: user.id,
          gameResultId: gameResult.id,
          transactionId: transaction.id,
        },
      });

      return res.status(201).json(newBid);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in /api/bids:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
