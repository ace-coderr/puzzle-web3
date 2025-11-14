import { NextResponse } from "next/server";
import { PrismaClient, BidStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

/**
 * GET → Fetch last 10 successful bids
 * POST → Create a new bid + linked gameResult
 */
export async function GET() {
    try {
        const bids = await prisma.bid.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
                user: {
                    select: { walletAddress: true },
                },
            },
        });

        const formatted = bids.map((b) => ({
            id: b.id,
            walletAddress: b.user.walletAddress,
            amount: Number(b.amount),
            createdAt: b.createdAt,
            status: b.status,
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("❌ Error fetching bids:", error);
        return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function POST(req: Request) {
    try {
        const { walletAddress, amount } = await req.json();

        if (!walletAddress || !amount) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // ✅ Create a game result first
        const gameResult = await prisma.gameResult.create({
            data: {
                userId: user.id,
                gameId: crypto.randomUUID(),
                bidding: new Decimal(amount),
            },
        });

        // ✅ Then create a bid linked to that game result
        const newBid = await prisma.bid.create({
            data: {
                amount: new Decimal(amount),
                status: BidStatus.PENDING,
                userId: user.id,
                gameResultId: gameResult.id, // link created record
            },
            include: { user: true, gameResult: true },
        });

        return NextResponse.json(newBid, { status: 201 });
    } catch (error: any) {
        console.error("❌ Error creating bid:", error);
        return NextResponse.json({ error: "Failed to create bid" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}