import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bids = await prisma.bid.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 20,
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
      walletAddress: b.user.walletAddress || "Anon",
      amount: Number(b.amount),
      createdAt: b.createdAt.toISOString(),
      gameId: b.gameResult.gameId,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching recent bids:", error);
    return NextResponse.json([], { status: 500 });
  }
}