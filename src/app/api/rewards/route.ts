import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ──────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────
const REWARD_WALLET_SECRET = process.env.REWARD_WALLET_SECRET_KEY
    ? Uint8Array.from(JSON.parse(process.env.REWARD_WALLET_SECRET_KEY))
    : null;

if (!REWARD_WALLET_SECRET) {
    throw new Error("REWARD_WALLET_SECRET_KEY missing in .env");
}

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");
const rewardKeypair = Keypair.fromSecretKey(REWARD_WALLET_SECRET);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    let txSignature: string;

    try {
        const { gameId, walletAddress } = await req.json();

        if (!gameId || !walletAddress) {
            return NextResponse.json(
                { error: "gameId and walletAddress required" },
                { status: 400 }
            );
        }

        // 1. Atomic check + mark claimed
        const claim = await prisma.$transaction(async (tx) => {
            const game = await tx.gameResult.findUnique({
                where: { gameId },
                include: { rewardEntry: true },
            });

            if (!game) throw new Error("Game not found");
            if (!game.won) throw new Error("You didn't win this game");
            if (!game.reward) throw new Error("No reward");
            if (game.rewardEntry?.claimed) throw new Error("Already claimed");

            await tx.reward.update({
                where: { gameResultId: gameId },
                data: { claimed: true, claimedAt: new Date() },
            });

            return { amount: game.reward, userId: game.userId };
        });

        // 2. Get blockhash SAFELY
        let blockhashResponse;
        for (let i = 0; i < 5; i++) {
            try {
                blockhashResponse = await connection.getLatestBlockhash();
                break;
            } catch (err) {
                if (i === 4) throw new Error("RPC unreachable — cannot get blockhash");
                await new Promise((r) => setTimeout(r, 1000));
            }
        }

        const { blockhash, lastValidBlockHeight } = await blockhashResponse!;

        // 3. Build & send transaction
        const recipient = new PublicKey(walletAddress);
        const lamports = Math.round(Number(claim.amount) * LAMPORTS_PER_SOL);

        const transaction = new Transaction();
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: rewardKeypair.publicKey,
                toPubkey: recipient,
                lamports,
            })
        );

        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = rewardKeypair.publicKey;
        transaction.sign(rewardKeypair);

        txSignature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            maxRetries: 5,
        });

        await connection.confirmTransaction(
            { signature: txSignature, blockhash, lastValidBlockHeight },
            "confirmed"
        );

        // 4. Update balance + log transaction
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: claim.userId },
                data: { balance: { increment: claim.amount } },
            });

            await tx.transaction.create({
                data: {
                    userId: claim.userId,
                    amount: claim.amount,
                    type: "REWARD",
                    status: "SUCCESS",
                    txSignature,
                },
            });
        });

        return NextResponse.json({
            success: true,
            amount: Number(claim.amount).toFixed(6),
            txSignature,
            explorer: `https://solana.fm/tx/${txSignature}${RPC_URL.includes("devnet") ? "?cluster=devnet" : ""}`,
        });
    } catch (error: any) {
        console.error("Reward claim failed:", error);
        return NextResponse.json(
            {
                error: error.message.includes("claimed")
                    ? "Already claimed"
                    : error.message.includes("win")
                        ? "Not a winning game"
                        : "Claim failed — try again",
            },
            { status: 400 }
        );
    }
}