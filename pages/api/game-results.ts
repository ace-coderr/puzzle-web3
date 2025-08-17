// pages/api/game-results.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { walletAddress, score, won, moves, bidding } = req.body;

    if (!walletAddress || score == null || moves == null || bidding == null) {
        return res.status(400).json({ error: 'walletAddress, score, moves, and bidding are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.balance < bidding) {
            return res.status(400).json({ error: 'Insufficient balance for bidding' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { balance: { decrement: bidding }, updatedAt: new Date() }
        });

        const result = await prisma.gameResult.create({
            data: {
                score,
                moves,
                won,
                bidding,
                user: { connect: { id: user.id } }
            }
        });

        await prisma.transaction.create({
            data: {
                amount: bidding,
                type: 'BID',
                userId: user.id
            }
        });

        res.status(201).json({ message: 'Game result recorded', result, balance: updatedUser.balance });
    } catch (error) {
        console.error('❌ Game Result Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}