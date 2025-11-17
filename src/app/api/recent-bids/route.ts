import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BidStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const bids = await prisma.bid.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      where: { status: BidStatus.SUCCESS }, //
      include: {
        user: {
          select: { walletAddress: true },
        },
        gameResult: true,
      },
    });

    const formatted = bids.map((b) => ({
      id: b.id,
      walletAddress: b.user.walletAddress,
      amount: Number(b.amount),
      createdAt: b.createdAt,
      status: b.status,
      gameId: b.gameResult.gameId,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching bids:", error);
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { walletAddress, amount } = await req.json();

    if (!walletAddress || !amount) {
      return NextResponse.json({ error: "Missing walletAddress or amount" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Create GameResult with ALL required fields
    const gameResult = await prisma.gameResult.create({
      data: {
        gameId: crypto.randomUUID(),
        userId: user.id,
        moves: 0,
        score: 0,
        bidding: new Decimal(amount),
        won: false,
        difficulty: "medium",
      },
    });

    // 2. Create Bid linked to GameResult
    const newBid = await prisma.bid.create({
      data: {
        amount: new Decimal(amount),
        status: BidStatus.PENDING,
        userId: user.id,
        gameResultId: gameResult.gameId,
      },
      include: {
        user: { select: { walletAddress: true } },
        gameResult: true,
      },
    });

    // Emit event for frontend
    document.dispatchEvent(
      new CustomEvent("puzzle-restart", {
        detail: {
          walletAddress: user.walletAddress,
          amount,
          gameId: gameResult.gameId,
        },
      })
    );

    return NextResponse.json(
      {
        bid: {
          id: newBid.id,
          amount: Number(newBid.amount),
          status: newBid.status,
          gameId: newBid.gameResult.gameId,
          walletAddress: newBid.user.walletAddress,
        },
        message: "Bid created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating bid:", error);
    return NextResponse.json(
      { error: "Failed to create bid", details: error.message },
      { status: 500 }
    );
  }
}