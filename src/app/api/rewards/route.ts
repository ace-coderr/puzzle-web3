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
import crypto from "crypto";

/* ──────────────────────────────────────────────
   ENV VALIDATION
────────────────────────────────────────────── */

if (!process.env.REWARD_WALLET_SECRET_ENCRYPTED) {
    throw new Error("REWARD_WALLET_SECRET_ENCRYPTED missing");
}

if (!process.env.WALLET_ENCRYPTION_KEY) {
    throw new Error("WALLET_ENCRYPTION_KEY missing");
}

const RPC_URL =
    process.env.RPC_URL ?? "https://api.devnet.solana.com";

/* ──────────────────────────────────────────────
   SOLANA CONNECTION
────────────────────────────────────────────── */

const connection = new Connection(RPC_URL, "confirmed");

/* ──────────────────────────────────────────────
   DECRYPT SOLANA REWARD WALLET
────────────────────────────────────────────── */

function decryptRewardWallet(): Uint8Array {
    const encrypted = JSON.parse(
        process.env.REWARD_WALLET_SECRET_ENCRYPTED!
    );

    const key = Buffer.from(
        process.env.WALLET_ENCRYPTION_KEY!,
        "hex"
    );

    if (key.length !== 32) {
        throw new Error("Invalid AES-256 key length");
    }

    const iv = Buffer.from(encrypted.iv, "hex"); // MUST be 12 bytes
    const tag = Buffer.from(encrypted.tag, "hex");
    const data = Buffer.from(encrypted.data, "hex");

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final(),
    ]);

    if (decrypted.length !== 64) {
        throw new Error("Invalid Solana secret key length");
    }

    return new Uint8Array(decrypted);
}

function getRewardKeypair(): Keypair {
    return Keypair.fromSecretKey(decryptRewardWallet());
}

/* ──────────────────────────────────────────────
   NEXT CONFIG
────────────────────────────────────────────── */

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────
   POST /api/rewards
────────────────────────────────────────────── */

export async function POST(req: Request) {
    try {
        const { gameId, walletAddress } = await req.json();

        if (!gameId || !walletAddress) {
            return NextResponse.json(
                { error: "gameId and walletAddress required" },
                { status: 400 }
            );
        }

        /* ───── 1. Atomic claim lock (DB-first) ───── */

        const claim = await prisma.$transaction(async (tx) => {
            const game = await tx.gameResult.findUnique({
                where: { gameId },
                include: { rewardEntry: true },
            });

            if (!game) throw new Error("GAME_NOT_FOUND");
            if (!game.won) throw new Error("NOT_WINNER");
            if (!game.reward) throw new Error("NO_REWARD");
            if (game.rewardEntry?.claimed)
                throw new Error("ALREADY_CLAIMED");

            await tx.reward.update({
                where: { gameResultId: gameId },
                data: {
                    claimed: true,
                    claimedAt: new Date(),
                },
            });

            return {
                amount: Number(game.reward),
                userId: game.userId,
            };
        });

        /* ───── 2. Build Solana transaction ───── */

        const rewardKeypair = getRewardKeypair();

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

        const recipient = new PublicKey(walletAddress);
        const lamports = Math.round(
            claim.amount * LAMPORTS_PER_SOL
        );

        const transaction = new Transaction();

        transaction.feePayer = rewardKeypair.publicKey;
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;

        transaction.add(
            SystemProgram.transfer({
                fromPubkey: rewardKeypair.publicKey,
                toPubkey: recipient,
                lamports,
            })
        );

        transaction.sign(rewardKeypair);

        /* ───── 3. Send & confirm transaction ───── */

        const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { maxRetries: 5 }
        );

        await connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            "confirmed"
        );

        /* ───── 4. Persist success ───── */

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: claim.userId },
                data: {
                    balance: { increment: claim.amount },
                },
            });

            await tx.transaction.create({
                data: {
                    userId: claim.userId,
                    amount: claim.amount,
                    type: "REWARD",
                    status: "SUCCESS",
                    txSignature: signature,
                },
            });
        });

        return NextResponse.json({
            success: true,
            amount: claim.amount.toFixed(6),
            txSignature: signature,
            explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        });
    } catch (err: any) {
        console.error("Reward claim failed:", err);

        const message =
            err.message === "ALREADY_CLAIMED"
                ? "Already claimed"
                : err.message === "NOT_WINNER"
                    ? "Not a winning game"
                    : err.message === "NO_REWARD"
                        ? "No reward available"
                        : "Reward claim failed";

        return NextResponse.json(
            { error: message },
            { status: 400 }
        );
    }
}