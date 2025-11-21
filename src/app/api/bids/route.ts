import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

// GET — Recent successful bids
export async function GET() {
  try {
    const bids = await prisma.bid.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { walletAddress: true } },
        gameResult: { select: { gameId: true } },
      },
    });

    const formatted = bids.map((b) => ({
      id: b.id,
      wallet: b.user.walletAddress
        ? `${b.user.walletAddress.slice(0, 4)}...${b.user.walletAddress.slice(-4)}`
        : "Anon",
      amount: Number(b.amount),
      date: b.createdAt.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      }),
      gameId: b.gameResult.gameId,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching recent bids:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST — Create bid + game session
export async function POST(req: Request) {
  try {
    const { walletAddress, amount, gameId, txSignature } = await req.json();

    if (!walletAddress || !amount || !gameId || !txSignature) {
      return NextResponse.json(
        { error: "Missing walletAddress, amount, gameId or txSignature" },
        { status: 400 }
      );
    }

    // Create or fetch user
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });

    // Create GameResult
    const gameResult = await prisma.gameResult.create({
      data: {
        gameId,
        userId: user.id,
        moves: 0,
        score: 0,
        bidding: new Decimal(amount),
        won: false,
        difficulty: "medium",
      },
    });

    // Create Bid linked to game session
    const bid = await prisma.bid.create({
      data: {
        amount: new Decimal(amount),
        status: "SUCCESS",
        userId: user.id,
        gameResultId: gameResult.gameId,
      },
    });

    // Create Transaction record
    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        bidId: bid.id,
        amount: new Decimal(amount),
        type: "BID",
        status: "SUCCESS",
        txSignature,
      },
    });

    return NextResponse.json(
      {
        bid: {
          id: bid.id,
          amount: Number(bid.amount),
          status: bid.status,
          gameId: gameResult.gameId,
          walletAddress: user.walletAddress,
        },
        transaction: tx,
        message: "Bid + Transaction created successfully",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating bid:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create bid" },
      { status: 500 }
    );
  }
}
