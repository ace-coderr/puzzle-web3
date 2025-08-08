import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { walletAddress, score, outcome, moves } = req.body;

    if (!walletAddress || score == null || !outcome || moves == null) {
        return res.status(400).json({ error: 'walletAddress, score, and outcome are required' });
    }

    const won = outcome.toLowerCase() === 'win';

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = await prisma.gameResult.create({
            data: {
                score,
                moves,
                won,
                user: {
                    connect: { id: user.id }
                }
            },
        });

        return res.status(201).json(result);
    } catch (error) {
        console.error('❌ Game Result Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}