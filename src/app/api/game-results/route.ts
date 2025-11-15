import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { walletAddress, moves, score, bidding, won, gameId } = body;

        // === VALIDATION ===
        if (!walletAddress || !gameId) {
            return NextResponse.json(
                { error: "walletAddress and gameId are required" },
                { status: 400 }
            );
        }

        const bidAmount = parseFloat(bidding);
        if (isNaN(bidAmount) || bidAmount <= 0) {
            return NextResponse.json(
                { error: "Invalid bid amount" },
                { status: 400 }
            );
        }

        // === USER: Find or create ===
        let user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) {
            user = await prisma.user.create({ data: { walletAddress } });
        }

        // === GAME RESULT: UPSERT (safe if bid already created it) ===
        const gameResult = await prisma.gameResult.upsert({
            where: { gameId },
            update: {
                moves,
                score,
                won,
                bidding: new Decimal(bidding),
            },
            create: {
                userId: user.id,
                gameId,
                moves,
                score,
                bidding: new Decimal(bidding),
                won,
            },
        });

        // === REWARD: Create if won ===
        if (won) {
            const rewardAmount = new Decimal(bidAmount).mul(2);
            await prisma.reward.create({
                data: {
                    userId: user.id,
                    title: "Puzzle Victory",
                    description: `Won in ${moves} moves, ${score}s`,
                    amount: rewardAmount,
                    claimed: false,
                },
            });
        }

        return NextResponse.json({ success: true, gameResult });
    } catch (error: any) {
        console.error("Game result error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save game result" },
            { status: 500 }
        );
    }
}