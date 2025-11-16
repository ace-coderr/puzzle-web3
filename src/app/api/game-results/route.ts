// app/api/game-results/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// === POST: Save Game Result + Reward ===
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      walletAddress,
      moves = 0,
      score = 0,
      bidding,
      won = false,
      gameId,
      difficulty = "medium",
    } = body;

    if (!walletAddress || !gameId) {
      return NextResponse.json(
        { error: "walletAddress and gameId are required" },
        { status: 400 }
      );
    }

    const bidAmount = parseFloat(bidding);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
    }

    const multiplierMap: Record<string, number> = { easy: 1.2, medium: 1.5, hard: 2.5 };
    const multiplier = multiplierMap[difficulty] || 1.5;
    const rewardAmount = won ? new Decimal(bidAmount * multiplier) : null;

    let user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) user = await prisma.user.create({ data: { walletAddress } });

    // === UPSERT USING gameId AS PRIMARY KEY ===
    const gameResult = await prisma.gameResult.upsert({
      where: { gameId }, // ← gameId is @id
      update: {
        moves,
        score,
        won,
        bidding: new Decimal(bidding),
        difficulty,
        reward: rewardAmount,
      },
      create: {
        gameId, // ← This is the @id
        userId: user.id,
        moves,
        score,
        bidding: new Decimal(bidding),
        won,
        difficulty,
        reward: rewardAmount,
      },
    });

    // === CREATE REWARD IF WON ===
    if (won && rewardAmount) {
      await prisma.reward.upsert({
        where: { gameResultId: gameResult.gameId }, // ← Use gameId
        update: {},
        create: {
          userId: user.id,
          gameResultId: gameResult.gameId,
          title: "Puzzle Victory",
          description: `Won in ${moves} moves, ${score}s (${difficulty.toUpperCase()})`,
          amount: rewardAmount,
          claimed: false,
        },
      });
    }

    return NextResponse.json({ success: true, gameResult });
  } catch (error: any) {
    console.error("Save game result error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save game result" },
      { status: 500 }
    );
  }
}

// === GET: Fetch Game History + Unclaimed Rewards ===
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        gameResults: {
          orderBy: { createdAt: "desc" },
          include: { rewardEntry: true },
        },
      },
    });

    if (!user) return NextResponse.json({ results: [] });

    const results = user.gameResults.map((gr) => ({
      id: gr.gameId, // ← Now gameId is the ID
      won: gr.won,
      moves: gr.moves,
      time: gr.score,
      bidding: gr.bidding.toNumber(),
      reward: gr.reward?.toNumber() || null,
      claimed: gr.rewardEntry?.claimed || false,
      difficulty: gr.difficulty,
      createdAt: gr.createdAt.toISOString(),
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Fetch history error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}