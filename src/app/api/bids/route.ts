// app/api/bids/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: Request) {
  try {
    const { walletAddress, gameId, amount, txSignature } = await req.json();

    if (!walletAddress || !amount || !gameId || !txSignature) {
      return NextResponse.json(
        { error: "walletAddress, amount, gameId, and txSignature are required" },
        { status: 400 }
      );
    }

    const bidAmount = new Decimal(amount);

    const result = await prisma.$transaction(async (tx) => {
      // === UPSERT USER ===
      const user = await tx.user.upsert({
        where: { walletAddress },
        update: {},
        create: { walletAddress },
      });

      // === UPSERT GAME RESULT (with ALL required fields) ===
      const gameResult = await tx.gameResult.upsert({
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

      // === CREATE BID ===
      const bid = await tx.bid.create({
        data: {
          amount: bidAmount,
          userId: user.id,
          gameResultId: gameId,
          status: "SUCCESS",
        },
      });

      // === RECORD TRANSACTION ===
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

      return { bid, gameResult };
    });

    return NextResponse.json({
      success: true,
      message: "Bid recorded",
      details: result,
    });
  } catch (error: any) {
    console.error("Bid placement failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}