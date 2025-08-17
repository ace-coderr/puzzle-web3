// pages/api/withdraw.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { walletAddress, amount } = req.body;

    if (!walletAddress || !amount || amount <= 0) {
        return res.status(400).json({ error: 'walletAddress and valid amount are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { balance: { decrement: amount }, updatedAt: new Date() }
        });

        await prisma.transaction.create({
            data: {
                amount,
                type: 'WITHDRAWAL',
                userId: user.id
            }
        });

        res.status(200).json({ message: 'Withdrawal successful', balance: updatedUser.balance });
    } catch (error) {
        console.error('❌ Withdrawal Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
