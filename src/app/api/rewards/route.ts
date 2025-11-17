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
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// ──────────────────────────────────────────────────────────────
// CONFIG – Put these in your .env.local
// ──────────────────────────────────────────────────────────────
const REWARD_WALLET_SECRET = process.env.REWARD_WALLET_SECRET_KEY
    ? Uint8Array.from(JSON.parse(process.env.REWARD_WALLET_SECRET_KEY))
    : null;

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const TOKEN_MINT = process.env.TOKEN_MINT_ADDRESS?.trim() || null;

if (!REWARD_WALLET_SECRET) {
    throw new Error("REWARD_WALLET_SECRET_KEY is missing in .env.local – real claims disabled");
}

const connection = new Connection(RPC_URL, "confirmed");
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

        // ───── 1. Atomic DB check + mark as claimed ─────
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

            // Mark as claimed atomically
            await tx.reward.update({
                where: { id: game.rewardEntry!.id, claimed: false },
                data: { claimed: true, claimedAt: new Date() },
            });

            return { amount: game.reward };
        });

        // ───── 2. Real On-Chain Transfer ─────
        let txSignature: string;

        if (TOKEN_MINT) {
            // ── SPL Token Transfer ──
            const mint = new PublicKey(TOKEN_MINT);
            const recipient = new PublicKey(walletAddress);

            const fromATA = await getOrCreateAssociatedTokenAccount(
                connection,
                rewardKeypair,
                mint,
                rewardKeypair.publicKey
            );

            const toATA = await getOrCreateAssociatedTokenAccount(
                connection,
                rewardKeypair,
                mint,
                recipient
            );

            txSignature = await transfer(
                connection,
                rewardKeypair,
                fromATA.address,
                toATA.address,
                rewardKeypair.publicKey,
                BigInt(Number(claim.amount) * 1_000_000_000)
            );
        } else {
            // ── Native SOL Transfer ──
            const recipient = new PublicKey(walletAddress);
            const lamports = Math.floor(Number(claim.amount) * LAMPORTS_PER_SOL);

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: rewardKeypair.publicKey,
                    toPubkey: recipient,
                    lamports,
                })
            );

            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            tx.feePayer = rewardKeypair.publicKey;
            tx.sign(rewardKeypair);

            txSignature = await connection.sendRawTransaction(tx.serialize());
            await connection.confirmTransaction(txSignature, "confirmed");
        }

        console.log(`Reward claimed! Tx: https://solana.fm/tx/${txSignature}`);

        return NextResponse.json({
            success: true,
            amount: Number(claim.amount).toFixed(6),
            txSignature,
            explorer: `https://solana.fm/tx/${txSignature}${RPC_URL.includes("devnet") ? "?cluster=devnet" : ""}`,
        });
    } catch (error: any) {
        console.error("Claim failed:", error);

        return NextResponse.json(
            {
                error: error.message.includes("claimed")
                    ? error.message
                    : "Claim failed – please try again",
            },
            { status: error.message.includes("claimed") ? 400 : 500 }
        );
    }
}