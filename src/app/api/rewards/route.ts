import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConnection, getServerWallet } from "@/lib/solana";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const connection = getConnection();
const serverWallet = getServerWallet();

export async function POST(req: Request) {
    try {
        const { gameResultId, walletAddress } = await req.json();

        if (!gameResultId || !walletAddress) {
            return NextResponse.json(
                { error: "Missing gameResultId or walletAddress" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // FIX: Use `gameId`, NOT `id`
            const gameResult = await tx.gameResult.findUnique({
                where: { gameId: gameResultId }, // ← CORRECT
                include: {
                    user: true,
                    rewardEntry: true,
                },
            });

            if (!gameResult) throw new Error("Game result not found");
            if (!gameResult.won) throw new Error("You did not win this game");
            if (!gameResult.rewardEntry) throw new Error("No reward available");
            if (gameResult.rewardEntry.claimed) throw new Error("Already claimed");
            if (gameResult.user.walletAddress !== walletAddress) {
                throw new Error("Unauthorized");
            }

            const amount = gameResult.rewardEntry.amount;
            const lamports = Number(amount) * LAMPORTS_PER_SOL;

            // Send SOL on-chain
            const transferTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: serverWallet.publicKey,
                    toPubkey: new PublicKey(walletAddress),
                    lamports,
                })
            );

            const signature = await connection.sendTransaction(transferTx, [serverWallet]);
            await connection.confirmTransaction(signature, "confirmed");

            // Mark reward as claimed
            await tx.reward.update({
                where: { id: gameResult.rewardEntry.id },
                data: { claimed: true },
            });

            // Record transaction
            await tx.transaction.create({
                data: {
                    userId: gameResult.userId,
                    amount,
                    type: "REWARD",
                    status: "SUCCESS",
                    txSignature: signature,
                },
            });

            return {
                success: true,
                amount: amount.toString(),
                txSignature: signature,
            };
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