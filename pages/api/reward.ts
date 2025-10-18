import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔹 Handle GET — fetch unclaimed rewards
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const walletAddress = req.query.wallet as string;

    if (!walletAddress) {
      return res.status(400).json({ error: "Missing wallet address" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) return res.json({ rewards: [] });

      const unclaimed = await prisma.gameResult.findMany({
        where: { userId: user.id, won: true, claimed: false },
        orderBy: { createdAt: "desc" },
      });

      const rewards = unclaimed.map((g) => ({
        id: g.id,
        title: "🎁 Win Reward",
        description: `Won game with ${g.moves} moves`,
        amount: Number(g.bidding) * 2,
        claimed: g.claimed,
      }));

      return res.json({ rewards });
    } catch (err) {
      console.error("Error fetching rewards:", err);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      await prisma.$disconnect();
    }
  }

  // 🔹 Handle POST — claim reward
  else if (req.method === "POST") {
    try {
      const { walletAddress, rewardId, txSignature } = req.body;

      if (!walletAddress || !rewardId) {
        return res.status(400).json({ error: "Missing walletAddress or rewardId" });
      }

      const user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const game = await prisma.gameResult.findUnique({ where: { id: rewardId } });
      if (!game || !game.won || game.claimed) {
        return res.status(400).json({ error: "Invalid or already claimed reward" });
      }

      const rewardAmount = Number(game.bidding) * 2;

      const updatedUser = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: rewardAmount } },
        });

        await tx.gameResult.update({
          where: { id: rewardId },
          data: { claimed: true },
        });

        await tx.transaction.create({
          data: {
            amount: rewardAmount,
            type: "WIN",
            status: "SUCCESS",
            txSignature: txSignature || null, // ✅ correct field name
            userId: user.id,
          },
        });

        return updated;
      });

      return res.json({
        success: true,
        newBalance: updatedUser.balance,
      });
    } catch (err) {
      console.error("Reward claim failed:", err);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      await prisma.$disconnect();
    }
  }

  // 🔹 Fallback
  else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}