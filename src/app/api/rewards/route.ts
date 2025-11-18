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

// ──────────────────────────────────────────────────────────────
// CONFIG – Using your .env file (not .env.local)
// ──────────────────────────────────────────────────────────────
const REWARD_WALLET_SECRET = process.env.REWARD_WALLET_SECRET_KEY
    ? Uint8Array.from(JSON.parse(process.env.REWARD_WALLET_SECRET_KEY))
    : null;

if (!REWARD_WALLET_SECRET) {
    throw new Error("REWARD_WALLET_SECRET_KEY is missing in .env – real claims disabled");
}

// Use your working RPC (official Solana Devnet — always works, no key needed)
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";

const connection = new Connection(RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
});

const rewardKeypair = Keypair.fromSecretKey(REWARD_WALLET_SECRET);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { gameId, walletAddress } = await req.json();

        if (!gameId || !walletAddress) {
            return NextResponse.json(
                { error: "Missing gameId or walletAddress" },
                { status: 400 }
            );
        }

        // 1. Atomic DB check + mark claimed
        const claim = await prisma.$transaction(async (tx) => {
            const game = await tx.gameResult.findUnique({
                where: { gameId },
                include: { rewardEntry: true },
            });

            if (!game || !game.won || !game.reward) {
                throw new Error("No reward available");
            }
            if (game.rewardEntry?.claimed) {
                throw new Error("Already claimed");
            }

            await tx.reward.update({
                where: { id: game.rewardEntry!.id },
                data: { claimed: true, claimedAt: new Date() },
            });

            return { amount: game.reward };
        });

        // 2. Real SOL Transfer (Native SOL – works 100% on Devnet)
        let txSignature: string;

        const recipient = new PublicKey(walletAddress);
        const lamports = Math.round(Number(claim.amount) * LAMPORTS_PER_SOL);

        // Retry logic for blockhash (fixes "Failed to fetch" issues)
        let latestBlockhash;
        for (let i = 0; i < 3; i++) {
            try {
                latestBlockhash = await connection.getLatestBlockhash();
                break;
            } catch (err) {
                if (i === 2) throw err;
                await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
            }
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: rewardKeypair.publicKey,
                toPubkey: recipient,
                lamports,
            })
        );

        transaction.recentBlockhash = latestBlockhash!.blockhash;
        transaction.feePayer = rewardKeypair.publicKey;
        transaction.sign(rewardKeypair);

        txSignature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
        });

        await connection.confirmTransaction(txSignature, "confirmed");

        console.log(`Reward sent! Tx: https://solana.fm/tx/${txSignature}?cluster=devnet`);

        return NextResponse.json({
            success: true,
            amount: Number(claim.amount).toFixed(6),
            txSignature,
            explorer: `https://solana.fm/tx/${txSignature}?cluster=devnet`,
        });
    } catch (error: any) {
        console.error("Claim failed:", error);

        const message = error.message || "Claim failed – please try again";

        return NextResponse.json(
            {
                error:
                    message.includes("claimed") || message.includes("available")
                        ? message
                        : "Network error – please try again in a few seconds",
            },
            { status: message.includes("claimed") || message.includes("available") ? 400 : 500 }
        );
    }
}