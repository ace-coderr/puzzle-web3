import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/* =====================================================
   GET — Fetch full game history
===================================================== */
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
        time: r.time,
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

/* =====================================================
   POST — Save game result (TIME-ONLY LOGIC)
===================================================== */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      walletAddress,
      time,
      bidding,
      won,
      gameId,
      difficulty = "medium",
    } = body;

    // --- Validation ---
    if (!walletAddress || typeof walletAddress !== "string")
      return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });

    if (!gameId || typeof gameId !== "string")
      return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });

    const timeNum = Number(time);
    const bidAmount = Number(bidding);

    if (!Number.isInteger(timeNum) || timeNum < 0)
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });

    if (isNaN(bidAmount) || bidAmount < 0)
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });

    const validDifficulties = ["easy", "medium", "hard"] as const;
    if (!validDifficulties.includes(difficulty))
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });

    // --- Find or create user ---
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

    // --- Reward calculation ---
    const multiplier =
      difficulty === "easy" ? 1.1 :
        difficulty === "medium" ? 1.5 :
          3.0;

    const rewardDecimal =
      won === true
        ? new Prisma.Decimal(bidAmount * multiplier)
        : null;

    // --- Atomic transaction ---
    await prisma.$transaction(async (tx) => {
      await tx.gameResult.upsert({
        where: { gameId },
        update: {
          moves: 0,
          bidding: bidAmount,
          won: Boolean(won),
          reward: rewardDecimal,
          difficulty,
          updatedAt: new Date(),
        },
        create: {
          gameId,
          userId: user.id,
          moves: 0,
          time: timeNum,
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
            title: `${difficulty.toUpperCase()} Puzzle Win`,
            description: `Completed in ${timeNum}s`,
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
    return NextResponse.json(
      { error: "Failed to save game result" },
      { status: 500 }
    );
  }
}