import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConnection, getServerWallet } from "@/lib/solana";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const connection = getConnection();
const serverWallet = getServerWallet();

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get("walletAddress");
        if (!walletAddress) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                rewards: {
                    where: { claimed: false },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        return NextResponse.json({ rewards: user?.rewards || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { rewardId, walletAddress } = await req.json();
        if (!rewardId || !walletAddress) throw new Error("Missing data");

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { walletAddress } });
            if (!user) throw new Error("User not found");

            const reward = await tx.reward.findUnique({ where: { id: rewardId } });
            if (!reward) throw new Error("Reward not found");
            if (reward.claimed) throw new Error("Already claimed");

            const amount = parseFloat(reward.amount.toString());
            const lamports = amount * 1e9;

            // === Transfer from server wallet ===
            const toPubkey = new PublicKey(walletAddress);
            const transferIx = SystemProgram.transfer({
                fromPubkey: serverWallet.publicKey,
                toPubkey,
                lamports,
            });

            const { blockhash } = await connection.getLatestBlockhash();
            const transaction = new Transaction().add(transferIx);
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = serverWallet.publicKey;

            const signature = await connection.sendTransaction(transaction, [serverWallet]);
            await connection.confirmTransaction(signature);

            // === Mark claimed ===
            await tx.reward.update({
                where: { id: rewardId },
                data: { claimed: true },
            });

            // === Record payout ===
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: reward.amount,
                    type: "REWARD",
                    status: "SUCCESS",
                    txSignature: signature,
                },
            });

            return { txSignature: signature };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Claim error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}