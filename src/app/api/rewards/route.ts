import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    Keypair,
    sendAndConfirmTransaction,
} from "@solana/web3.js";

const prisma = new PrismaClient();

const RPC_URL = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY!;
const connection = new Connection(RPC_URL, "confirmed");

function getTreasuryKeypair() {
    const secret = Uint8Array.from(JSON.parse(TREASURY_PRIVATE_KEY));
    return Keypair.fromSecretKey(secret);
}

// 🔹 GET — Fetch pending 2× reward
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get("wallet");
        if (!walletAddress)
            return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });

        const game = await prisma.gameResult.findFirst({
            where: { user: { walletAddress }, won: true, claimed: false },
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });

        if (!game) return NextResponse.json({ rewards: [] }, { status: 200 });

        const rewardAmount = Number(game.bidding) * 2;

        const reward = {
            id: game.id,
            title: "Game Win Reward",
            description: `2× your bid for winning Game ${game.gameId}`,
            amount: rewardAmount,
            claimed: false,
        };

        return NextResponse.json({ rewards: [reward] });
    } catch (err: any) {
        console.error("❌ GET /api/rewards error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 🔹 POST — Claim reward (sends SOL)
export async function POST(req: Request) {
    try {
        const { walletAddress } = await req.json();
        if (!walletAddress)
            return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });

        const game = await prisma.gameResult.findFirst({
            where: { user: { walletAddress }, won: true, claimed: false },
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });

        if (!game)
            return NextResponse.json({ error: "No unclaimed rewards" }, { status: 404 });

        const rewardAmount = Number(game.bidding) * 2;
        const lamports = rewardAmount * 1e9;

        const treasury = getTreasuryKeypair();
        const toPubkey = new PublicKey(walletAddress);

        const tx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: treasury.publicKey,
                toPubkey,
                lamports,
            })
        );

        const signature = await sendAndConfirmTransaction(connection, tx, [treasury]);

        await prisma.$transaction([
            prisma.gameResult.update({
                where: { id: game.id },
                data: { claimed: true },
            }),
            prisma.reward.create({
                data: {
                    title: "Game Win Reward",
                    description: `2× reward for Game ${game.gameId}`,
                    amount: rewardAmount,
                    claimed: true,
                    userId: game.user.id,
                },
            }),
            prisma.transaction.create({
                data: {
                    userId: game.user.id,
                    amount: rewardAmount,
                    type: "REWARD",
                    status: "SUCCESS",
                    txSignature: signature,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            txSignature: signature,
            message: `2× reward (${rewardAmount} SOL) sent to wallet.`,
        });
    } catch (err: any) {
        console.error("❌ POST /api/rewards error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}