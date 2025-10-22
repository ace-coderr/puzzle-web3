import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const bids = await prisma.bid.findMany({
        include: {
          user: { select: { walletAddress: true } },
          transactions: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return res.status(200).json(bids);
    } catch (err) {
      console.error("❌ Error fetching bids:", err);
      return res.status(500).json({ error: "Failed to fetch bids" });
    } finally {
      await prisma.$disconnect();
    }
  }

  if (req.method === "POST") {
    try {
      const { walletAddress, gameId, amount, txSignature } = req.body;

      if (!walletAddress || !amount || !gameId || !txSignature) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const bidAmount = Number(amount);
      if (Number(user.balance) < bidAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const updatedUser = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: bidAmount } },
        });

        const gameResult = await tx.gameResult.create({
          data: {
            gameId,
            userId: user.id,
            bidding: bidAmount,
            won: false,
          },
        });

        const bid = await tx.bid.create({
          data: {
            amount: bidAmount,
            userId: user.id,
            gameResultId: gameResult.id,
            status: "SUCCESS",
          },
        });

        await tx.transaction.create({
          data: {
            amount: bidAmount,
            type: "BID",
            status: "SUCCESS",
            userId: user.id,
            bidId: bid.id,
            txSignature,
          },
        });

        return updated;
      });

      return res.status(200).json({
        success: true,
        newBalance: updatedUser.balance,
        message: "✅ Bid placed successfully",
      });
    } catch (err) {
      console.error("❌ Bid placement failed:", err);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      await prisma.$disconnect();
    }
  }

  // ❌ Unsupported method
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}