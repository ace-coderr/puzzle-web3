import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

// GET — Recent successful bids → powers your beautiful RecentActivity feed
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

// POST — Create bid + game session (called after successful SOL transfer)
export async function POST(req: Request) {
  try {
    const { walletAddress, amount } = await req.json();

    if (!walletAddress || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid wallet or amount" },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });

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

    // Real-time magic — instant update in RecentActivity
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("recent-bid"));
    }

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
    console.error("Bid creation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to create bid",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}