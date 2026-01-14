import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { walletAddress } = await req.json();

        if (!walletAddress) {
            return NextResponse.json(
                { error: "walletAddress required" },
                { status: 400 }
            );
        }

        const user = await prisma.user.upsert({
            where: { walletAddress },
            update: {},
            create: { walletAddress },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("❌ User setup error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}