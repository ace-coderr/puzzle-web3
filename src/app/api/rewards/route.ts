import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConnection, getServerWallet } from "@/lib/solana";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const connection = getConnection();
const serverWallet = getServerWallet();

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");
    if (!walletAddress) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

    const user = await prisma.user.findUnique({
        where: { walletAddress },
        include: { rewards: { where: { claimed: false }, orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ rewards: user?.rewards || [] });
}

export async function POST(req: Request) {
    try {
        const { rewardId, walletAddress } = await req.json();

        if (!rewardId || !walletAddress) {
            return NextResponse.json({ error: "Missing rewardId or walletAddress" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const reward = await tx.reward.findUnique({
                where: { id: rewardId },
                include: { user: true },
            });

            if (!reward || reward.claimed) throw new Error("Invalid or already claimed reward");
            if (reward.user.walletAddress !== walletAddress) throw new Error("Unauthorized");

            const lamports = Number(reward.amount) * LAMPORTS_PER_SOL;

            // === SEND SOL ON-CHAIN ===
            const transferTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: serverWallet.publicKey,
                    toPubkey: new PublicKey(walletAddress),
                    lamports,
                })
            );

            const signature = await connection.sendTransaction(transferTx, [serverWallet]);
            await connection.confirmTransaction(signature, "confirmed");

            // === Mark claimed ===
            await tx.reward.update({
                where: { id: rewardId },
                data: { claimed: true },
            });

            await tx.transaction.create({
                data: {
                    userId: reward.userId,
                    amount: reward.amount,
                    type: "REWARD",
                    status: "SUCCESS",
                    txSignature: signature,
                },
            });

            return { success: true, amount: reward.amount.toString(), txSignature: signature };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Reward claim error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to claim reward" },
            { status: 500 }
        );
    }
}