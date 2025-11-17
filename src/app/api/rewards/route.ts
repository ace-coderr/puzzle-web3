import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { gameId, walletAddress } = await request.json();

        // 1. GameResult exists?
        const gameResult = await prisma.gameResult.findUnique({
            where: { gameId },
            select: {
                reward: true, // reward: Decimal?
                rewardEntry: { select: { id: true, claimed: true } }
            }
        });

        if (!gameResult) {
            return NextResponse.json({ error: "Game result not found" }, { status: 404 });
        }

        // 2. Ensure reward exists
        if (!gameResult.rewardEntry) {
            return NextResponse.json({ error: "No reward entry found" }, { status: 400 });
        }

        // Already claimed?
        if (gameResult.rewardEntry.claimed) {
            return NextResponse.json({ error: "Reward already claimed" }, { status: 400 });
        }

        // 3. Mark reward as claimed
        await prisma.reward.update({
            where: { id: gameResult.rewardEntry.id },
            data: { claimed: true },
        });

        // fake solana signature
        const fakeSig = "11111111111111111111111111111111";

        return NextResponse.json({
            success: true,
            amount: gameResult.reward?.toString() || "0",
            txSignature: fakeSig,
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Claim failed" }, { status: 500 });
    }
}