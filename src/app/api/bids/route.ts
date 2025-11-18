import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

// GET — Recent successful bids (for leaderboard)
export async function GET() {
  try {
    const bids = await prisma.bid.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: {
          select: { walletAddress: true },
        },
        gameResult: {
          select: { gameId: true },
        },
      },
    });

    const formatted = bids.map((b) => ({
      id: b.id,
      wallet: b.user.walletAddress
        ? `${b.user.walletAddress.slice(0, 4)}...${b.user.walletAddress.slice(-4)}`
        : "Anon",
      amount: Number(b.amount),
      time: b.createdAt.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: b.createdAt.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      }),
      gameId: b.gameResult.gameId,
    }));

    return NextResponse.json({ bids: formatted });
  } catch (error) {
    console.error("Error fetching bids:", error);
    return NextResponse.json({ bids: [] }, { status: 500 });
  }
}

// POST — Create new bid + game session
export async function POST(req: Request) {
  try {
    const { walletAddress, amount } = await req.json();

    if (!walletAddress || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid walletAddress or amount" },
        { status: 400 }
      );
    }

    // Auto-create user if not exists
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });

    // Create GameResult first
    const gameResult = await prisma.gameResult.create({
      data: {
        gameId: crypto.randomUUID(),
        userId: user.id,
        moves: 0,
        score: 0,
        bidding: new Decimal(amount.toString()),
        won: false,
        difficulty: "medium",
      },
    });

    // Create Bid
    const newBid = await prisma.bid.create({
      data: {
        amount: new Decimal(amount.toString()),
        status: "SUCCESS",
        userId: user.id,
        gameResultId: gameResult.gameId,
      },
      include: {
        user: { select: { walletAddress: true } },
        gameResult: true,
      },
    });

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
      {
        error: "Failed to create bid",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}