"use client"

import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

const SOLANA_NETWORK = "https://api.devnet.solana.com";

export async function sendSolToVault(
    wallet: WalletContextState,
    amount: number,
    toAddress: string
) {
    if (!wallet.publicKey || !wallet.sendTransaction) throw new Error("Wallet not connected");

    const connection = new Connection(SOLANA_NETWORK, "confirmed");

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: new PublicKey(toAddress),
            lamports: amount * LAMPORTS_PER_SOL,
        })
    );

    const signature = await wallet.sendTransaction(transaction, connection);

    
    await connection.confirmTransaction(signature, "confirmed");

    return signature;
}
