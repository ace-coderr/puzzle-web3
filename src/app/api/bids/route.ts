import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const dynamic = "force-dynamic";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Helper to verify tx
async function verifyTxSignature(txSignature: string, walletAddress: string, amount: number) {
  try {
    const tx = await connection.getParsedTransaction(txSignature, { commitment: "confirmed" });
    if (!tx) throw new Error("Transaction not found");

    // Basic validation
    const fromAccount = tx.transaction.message.accountKeys[0].pubkey.toString();
    const transferInstruction = tx.transaction.message.instructions.find(inst => inst.programId.toString() === "11111111111111111111111111111111");

    if (!transferInstruction || !('parsed' in transferInstruction)) {
      throw new Error("No parsed transfer instruction found");
    }

    const transferredLamports = transferInstruction.parsed.info.lamports;

    if (fromAccount !== walletAddress || transferredLamports !== amount * LAMPORTS_PER_SOL) {
      throw new Error("Transaction mismatch");
    }
    return true;
  } catch (error) {
    console.error("Tx verification failed:", error);
    return false;
  }
}

// GET — Recent bids
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
      wallet: b.user.walletAddress || "Anon",
      amount: Number(b.amount),
      createdAt: b.createdAt.toISOString(),
      gameId: b.gameResult.gameId,
      txSignature: b.txSignature,
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

    // Verify tx signature
    if (!(await verifyTxSignature(txSignature, walletAddress, amount))) {
      return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
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

    return NextResponse.json({ success: true, bid });
  } catch (error: any) {
    console.error("POST /api/bids failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}