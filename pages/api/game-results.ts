import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, TransactionType, TransactionStatus, BidStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { walletAddress, score, won, moves, gameId } = req.body;

    if (!walletAddress || score == null || moves == null || !gameId) {
        return res.status(400).json({
            error: "walletAddress, score, moves, and gameId are required",
        });
    }

    try {
        const resultData = await prisma.$transaction(async (tx) => {
            // 1. Find the user
            const user = await tx.user.findUnique({ where: { walletAddress } });
            if (!user) {
                throw new Error("User not found. You must place a bid first.");
            }

            // 2. Find the existing gameResult stub created in /api/bids
            const existingGame = await tx.gameResult.findUnique({ where: { gameId } });
            if (!existingGame) {
                throw new Error("Game result not found. You must place a bid first.");
            }

            // 3. Ensure it hasn't already been finalized
            if (existingGame.score > 0 || existingGame.moves > 0) {
                throw new Error("Game result already finalized.");
            }

            const didWin = won === true || won === "WIN";

            // 4. Update the gameResult with actual play data
            const result = await tx.gameResult.update({
                where: { id: existingGame.id },
                data: {
                    score,
                    moves,
                    won: didWin,
                },
            });

            // 5. Update the bid status from PENDING → SUCCESS
            await tx.bid.update({
                where: { gameResultId: existingGame.id },
                data: { status: BidStatus.SUCCESS },
            });

            // 6. Handle win/loss
            if (didWin) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: { increment: new Decimal(existingGame.bidding).mul(2) } },
                });

                await tx.transaction.create({
                    data: {
                        amount: new Decimal(existingGame.bidding),
                        type: TransactionType.WIN,
                        status: TransactionStatus.SUCCESS,
                        userId: user.id,
                    },
                });
            } else {
                await tx.transaction.create({
                    data: {
                        amount: new Decimal(existingGame.bidding),
                        type: TransactionType.LOSE,
                        status: TransactionStatus.SUCCESS,
                        userId: user.id,
                    },
                });
            }

            const finalBalance = await tx.user.findUnique({
                where: { id: user.id },
                select: { balance: true, customId: true },
            });

            return {
                result,
                balance: finalBalance?.balance,
                customId: finalBalance?.customId,
            };
        });

        return res.status(200).json({
            message: "Game result finalized",
            result: resultData.result,
            balance: resultData.balance,
            customId: resultData.customId,
        });

    } catch (error: any) {
        console.error("❌ Finalize Game Error:", error);

        if (error.message.includes("not found")) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message.includes("already finalized")) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}
