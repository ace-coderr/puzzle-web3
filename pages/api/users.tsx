import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        try {
            let user = await prisma.user.findUnique({
                where: { walletAddress },
            });

            if (!user) {
                user = await prisma.user.create({
                    data: { walletAddress },
                });
            }

            return res.status(200).json(user);
        } catch (error) {
            console.error('❌ Error in API:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
