import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { walletAddress, gameId, amount, txSignature } = await req.json();

    if (!walletAddress || !gameId || !amount || !txSignature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const bidAmount = Number(amount);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { walletAddress },
        update: {},
        create: { walletAddress },
      });

      await tx.gameResult.upsert({
        where: { gameId },
        update: { bidding: bidAmount },
        create: {
          gameId,
          userId: user.id,
          moves: 0,
          score: 0,
          bidding: bidAmount,
          won: false,
          difficulty: "medium",
          reward: null,
        },
      });

      const bid = await tx.bid.create({
        data: {
          gameResultId: gameId,
          userId: user.id,
          amount: bidAmount,
          status: "SUCCESS",
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          bidId: bid.id,
          amount: bidAmount,
          type: "BID",
          status: "SUCCESS",
          txSignature,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bid failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}