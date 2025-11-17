import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — fetch history
export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get("walletAddress");
    if (!walletAddress) return NextResponse.json({ results: [] });

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });

    if (!user) return NextResponse.json({ results: [] });

    const results = await prisma.gameResult.findMany({
      where: { userId: user.id },
      include: { rewardEntry: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.gameId, // frontend expects id
        moves: r.moves,
        time: r.score,
        bidding: Number(r.bidding),
        reward: r.reward ? Number(r.reward) : null,
        won: r.won,
        claimed: r.rewardEntry?.claimed ?? false,
        difficulty: r.difficulty,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    console.error("GET game-results error:", e);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

// POST — save game result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      walletAddress,
      moves,
      score: time,
      bidding,
      won,
      gameId,
      difficulty = "medium",
    } = body;

    if (!walletAddress || !gameId) {
      return NextResponse.json({ error: "Missing walletAddress or gameId" }, { status: 400 });
    }

    const bidAmount = Number(bidding);
    if (isNaN(bidAmount) || bidAmount < 0) {
      return NextResponse.json({ error: "Invalid bidding amount" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
        select: { id: true },
      });
    }

    const multiplier =
      difficulty === "easy" ? 1.2 :
        difficulty === "medium" ? 1.5 : 2.5;

    const rewardAmount = won ? bidAmount * multiplier : null;

    const result = await prisma.gameResult.upsert({
      where: { gameId },
      update: {
        moves: Number(moves),
        score: Number(time),
        bidding: bidAmount,
        won: Boolean(won),
        reward: rewardAmount,
        difficulty,
        updatedAt: new Date(),
      },
      create: {
        gameId,
        userId: user.id,
        moves: Number(moves),
        score: Number(time),
        bidding: bidAmount,
        won: Boolean(won),
        difficulty,
        reward: rewardAmount,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("saveResult API ERROR:", error);
    return NextResponse.json({ error: "Failed to save game result" }, { status: 500 });
  }
}