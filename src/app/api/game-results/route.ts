import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConnection, getServerWallet, TREASURY_WALLET } from "@/lib/solana";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const connection = getConnection();
const serverWallet = getServerWallet();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            walletAddress,
            moves,
            score,
            bidding,      // Decimal string
            won,
            gameId,
        } = body;

        if (!walletAddress || !gameId) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        const bidAmount = parseFloat(bidding);
        if (bidAmount <= 0) {
            return NextResponse.json({ error: "Invalid bid" }, { status: 400 });
        }

        let user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) {
            user = await prisma.user.create({ data: { walletAddress } });
        }

        // === 1. Transfer bid from user → treasury ===
        const fromPubkey = new PublicKey(walletAddress);
        const lamports = bidAmount * 1e9;

        const transferIx = SystemProgram.transfer({
            fromPubkey,
            toPubkey: TREASURY_WALLET,
            lamports,
        });

        const { blockhash } = await connection.getLatestBlockhash();
        const tx = new Transaction().add(transferIx);
        tx.recentBlockhash = blockhash;
        tx.feePayer = fromPubkey;

        // User signs in frontend → we just record
        // In production: verify signature
        // For now: trust frontend + record

        // === 2. Save Game Result ===
        const gameResult = await prisma.gameResult.create({
            data: {
                userId: user.id,
                gameId,
                moves,
                score,
                bidding: bidding,
                won,
            },
        });

        // === 3. Create Reward if Won ===
        if (won) {
            const rewardAmount = bidAmount * 2;

            await prisma.reward.create({
                data: {
                    userId: user.id,
                    title: "Puzzle Victory",
                    description: `Won in ${moves} moves`,
                    amount: rewardAmount.toString(),
                    claimed: false,
                },
            });

            // Record bid transaction
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: bidding,
                    type: "BID",
                    status: "SUCCESS",
                    txSignature: "pending-user-sign", // update later
                },
            });
        }

        return NextResponse.json({ success: true, gameResult });
    } catch (error: any) {
        console.error("Game result error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}