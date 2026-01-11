import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET() {
    const headersList = await headers();
    const walletAddress = headersList.get("x-wallet-address") || undefined;
    try {
        const wins = await prisma.gameResult.groupBy({
            by: ["userId"],
            where: { won: true },
            _count: true,
            _sum: { bidding: true },
        });

        const userIds = wins.map((w) => w.userId);
        if (userIds.length === 0) {
            return NextResponse.json({ leaderboard: [], myRank: null });
        }

        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, walletAddress: true },
        });

        const userMap = new Map(users.map((u) => [u.id, u.walletAddress]));
        const sortedWins = wins.sort((a, b) => {
            const solA = Number(a._sum.bidding ?? 0);
            const solB = Number(b._sum.bidding ?? 0);
            if (solB !== solA) return solB - solA;
            return b._count - a._count;
        });

        const leaderboard: any[] = [];

        let myRank: any = null;

        sortedWins.forEach((item, idx) => {
            const wallet = userMap.get(item.userId);
            if (!wallet) return;
            const totalBid = Number(item._sum.bidding ?? 0);
            if (totalBid <= 0) return;
            const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
            const entry = {
                rank: idx + 1,
                wallet: shortWallet,
                wins: item._count,
                totalBid,
            };
            leaderboard.push(entry);
            if (walletAddress && wallet === walletAddress) {
                myRank = { ...entry, isMe: true };
            }
        });

        const displayedLeaderboard = leaderboard.slice(0, 50);
        if (myRank && myRank.rank > 50) {
            displayedLeaderboard.push(myRank);
        }

        return NextResponse.json({
            leaderboard: displayedLeaderboard,
            myRank,
        });

    } catch (error: any) {
        console.error("Leaderboard error:", error);
        return NextResponse.json(
            { error: "Failed to load", details: error.message },
            { status: 500 }
        );
    }
}