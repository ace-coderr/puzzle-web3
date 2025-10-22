import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const prisma = new PrismaClient();
const connection = new Connection(process.env.RPC_URL!, "confirmed");

// 🪙 Load treasury wallet (server wallet)
const secretKey = JSON.parse(process.env.SOLANA_SERVER_SECRET_KEY!);
const serverWallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

/**
 * ✅ GET — Fetch all rewards for a user
 * Example: /api/rewards?wallet=<walletAddress>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("wallet");

  if (!walletAddress) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { rewards: true },
    });

    return NextResponse.json({ rewards: user?.rewards || [] }, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching rewards:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * ✅ POST — Claim a reward and send SOL to the user
 * Body: { walletAddress, rewardId }
 */
export async function POST(req: Request) {
  try {
    const { walletAddress, rewardId } = await req.json();

    if (!walletAddress || !rewardId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔹 Verify user and reward
    const user = await prisma.user.findUnique({ where: { walletAddress } });
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });

    if (!user || !reward) {
      return NextResponse.json(
        { error: "User or reward not found" },
        { status: 404 }
      );
    }

    if (reward.claimed) {
      return NextResponse.json(
        { error: "Reward already claimed" },
        { status: 400 }
      );
    }

    // 🟡 Send SOL from treasury wallet to player's wallet
    const recipient = new PublicKey(walletAddress);
    const lamports = Number(reward.amount) * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverWallet.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    const txSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [serverWallet]
    );

    console.log("✅ Reward transaction confirmed:", txSignature);

    // 🟢 Perform database updates atomically
    await prisma.$transaction([
      prisma.reward.update({
        where: { id: rewardId },
        data: { claimed: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: reward.amount },
        },
      }),
      prisma.transaction.create({
        data: {
          amount: reward.amount,
          type: "REWARD",
          status: "SUCCESS",
          userId: user.id,
          txSignature,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "🎉 Reward claimed successfully!",
      txSignature,
    });
  } catch (err) {
    console.error("❌ Reward claim failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}