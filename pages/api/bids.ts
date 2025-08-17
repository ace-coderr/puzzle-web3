import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

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
        },
      });
      return res.status(200).json(bids);
    }

    if (req.method === "POST") {
      const { walletAddress, amount, txSignature, status } = req.body;

      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: { walletAddress },
        });
      }

      // Create bid
      const newBid = await prisma.bid.create({
        data: {
          amount,
          txSignature,
          status: (status as "PENDING" | "SUCCESS" | "FAILED") || "PENDING",
          userId: user.id,
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
