import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { walletAddress, amount } = req.body;

    if (!walletAddress || !amount) {
        return res.status(400).json({ error: 'walletAddress and amount are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const deposit = await prisma.deposit.create({
            data: {
                amount,
                userId: user.id,
            },
        });

        return res.status(201).json(deposit);
    } catch (error) {
        console.error('❌ Deposit Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}