import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, TransactionType, TransactionStatus } from "@prisma/client";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({ error: "gameId is required" });
  }

  // ✅ Get wallet and RPC from .env
  const secret = process.env.SOLANA_SERVER_SECRET_KEY;
  const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

  if (!secret) {
    return res.status(500).json({ error: "Server wallet not configured" });
  }

  try {
    // ✅ Load the game and its user
    const game = await prisma.gameResult.findUnique({
      where: { gameId },
      include: { user: true },
    });

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (!game.won) {
      return res.status(400).json({ error: "This game was not a win." });
    }

    if (game.claimed) {
      return res.status(400).json({ error: "Reward already claimed." });
    }

    if (!game.user.walletAddress) {
      return res.status(400).json({ error: "User wallet address not found." });
    }

    // ✅ Connect to Solana
    const secretKey = Uint8Array.from(JSON.parse(secret));
    const fromWallet = Keypair.fromSecretKey(secretKey);
    const connection = new Connection(rpcUrl, "confirmed");

    const toPubkey = new PublicKey(game.user.walletAddress);
    const lamports = Number(game.bidding) * 2 * 1e9; // Reward = 2x bid

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey,
        lamports,
      })
    );

    // ✅ Send the transaction
    const signature = await sendAndConfirmTransaction(connection, tx, [fromWallet]);

    // ✅ Update game status and log transaction in DB
    const result = await prisma.$transaction(async (tx) => {
      // Mark reward as claimed
      await tx.gameResult.update({
        where: { gameId },
        data: {
          claimed: true,
          claimTx: signature,
        },
      });

      // Record the blockchain transaction
      await tx.transaction.create({
        data: {
          amount: game.bidding.mul(2),
          type: TransactionType.WIN,
          
          status: TransactionStatus.SUCCESS,
          userId: game.userId,
        },
      });

      return true;
    });

    return res.status(200).json({
      message: "✅ Reward claimed successfully!",
      signature,
    });
  } catch (error: any) {
    console.error("❌ Claim reward error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}