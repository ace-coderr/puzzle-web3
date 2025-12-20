import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
export const dynamic = "force-dynamic";
// GET — Recent bids for RecentActivity component
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
      createdAt: b.createdAt.toISOString(),
      gameId: b.gameResult.gameId,
    }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/bids failed:", error);
    return NextResponse.json([], { status: 500 });
  }
}
// POST — Create bid
export async function POST(req: Request) {
  try {
    const { walletAddress, amount, gameId, txSignature, difficulty } = await req.json();
    if (!walletAddress || !amount || !gameId || !txSignature) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });
    const gameResult = await prisma.gameResult.create({
      data: {
        gameId,
        userId: user.id,
        bidding: new Decimal(amount),
        difficulty: difficulty || "medium",
      },
    });
    const bid = await prisma.bid.create({
      data: {
        gameResultId: gameResult.gameId,
        userId: user.id,
        amount: new Decimal(amount),
        status: "SUCCESS",
        txSignature,
      },
    });
    // Decrease balance
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: new Decimal(amount) } },
    });
    // Log transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        bidId: bid.id,
        amount: new Decimal(amount),
        type: "BID",
        status: "SUCCESS",
        txSignature,
      },
    });
    // REAL-TIME UPDATE
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("recent-bid"));
    }
    return NextResponse.json({ success: true, bid });
  } catch (error: any) {
    console.error("POST /api/bids failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}