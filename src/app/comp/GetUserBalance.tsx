import { Connection, PublicKey } from "@solana/web3.js";

export async function getUserSOLBalance(pubKey: string): Promise<number> {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const balance = await connection.getBalance(new PublicKey(pubKey));
    return balance / 1e9;
}