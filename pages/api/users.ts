import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserSOLBalance } from '@/app/comp/GetUserBalance';

const prisma = new PrismaClient();

// Helper: generate unique customId
async function generateUniqueCustomId() {
    let customId = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    let exists = await prisma.user.findUnique({ where: { customId } });

    while (exists) {
        customId = Math.floor(100000 + Math.random() * 900000);
        exists = await prisma.user.findUnique({ where: { customId } });
    }

    return customId;
}

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

            const onChainBalance = await getUserSOLBalance(walletAddress);

            if (onChainBalance === 0) {
                console.warn(
                    `⚠️ RPC fetch returned balance=0 for ${walletAddress}. 
                    Could be RPC failure or empty wallet.`
                );
            }

            if (!user) {
                const customId = await generateUniqueCustomId();

                user = await prisma.user.create({
                    data: {
                        walletAddress,
                        balance: onChainBalance,
                        customId,
                    },
                });
            } else {
                user = await prisma.user.update({
                    where: { walletAddress },
                    data: { balance: onChainBalance },
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
