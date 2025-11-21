// src/app/api/game-results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET — Fetch full game history (wins + losses + rewards)
export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get("walletAddress");
    if (!walletAddress?.trim()) return NextResponse.json({ results: [] });

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ results: [] });

    const results = await prisma.gameResult.findMany({
      where: { userId: user.id },
      include: { rewardEntry: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.gameId,
        moves: r.moves,
        time: r.score,
        bidding: Number(r.bidding),
        reward: r.reward ? Number(r.reward) : null,
        won: r.won,
        claimed: r.rewardEntry?.claimed ?? false,
        difficulty: r.difficulty,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/game-results error:", e);
    return NextResponse.json(
      { results: [], error: "Failed to load history" },
      { status: 500 }
    );
  }
}

// POST — Save game result + auto-create Reward (atomic)
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

    // Strong validation
    if (!walletAddress || typeof walletAddress !== "string")
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
    if (!gameId || typeof gameId !== "string")
      return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });

    const movesNum = Number(moves);
    const timeNum = Number(time);
    const bidAmount = Number(bidding);

    if (!Number.isInteger(movesNum) || movesNum < 0)
      return NextResponse.json({ error: "Invalid moves" }, { status: 400 });
    if (isNaN(timeNum) || timeNum < 0)
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    if (isNaN(bidAmount) || bidAmount < 0)
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });

    const validDifficulties = ["easy", "medium", "hard"] as const;
    if (!validDifficulties.includes(difficulty))
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });

    // Find or create user
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

    // Calculate reward
    const multiplier = difficulty === "easy" ? 1.2 : difficulty === "medium" ? 1.5 : 2.5;
    const rewardDecimal = won === true ? new Prisma.Decimal(bidAmount * multiplier) : null;

    // Atomic transaction: save game + create reward
    await prisma.$transaction(async (tx) => {
      await tx.gameResult.upsert({
        where: { gameId },
        update: {
          moves: movesNum,
          score: timeNum,
          bidding: bidAmount,
          won: Boolean(won),
          reward: rewardDecimal,
          difficulty,
          updatedAt: new Date(),
        },
        create: {
          gameId,
          userId: user.id,
          moves: movesNum,
          score: timeNum,
          bidding: bidAmount,
          won: Boolean(won),
          difficulty,
          reward: rewardDecimal,
        },
      });

      if (won && rewardDecimal) {
        await tx.reward.upsert({
          where: { gameResultId: gameId },
          update: {},
          create: {
            gameResultId: gameId,
            userId: user.id,
            title: `${difficulty.toUpperCase()} Puzzle Win!`,
            description: `Won with ${movesNum} moves in ${timeNum}s`,
            amount: rewardDecimal,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: won ? "Game saved + reward registered!" : "Game saved",
    });
  } catch (error: any) {
    console.error("POST /api/game-results error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to save game result" },
      { status: 500 }
    );
  }
}