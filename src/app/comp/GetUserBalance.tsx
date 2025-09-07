import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINTS = [
    "https://api.devnet.solana.com", // Solana default
    "https://rpc.ankr.com/solana_devnet", // Ankr free RPC
];

export async function getUserSOLBalance(pubKey: string): Promise<number> {
    try {
        // Validate pubkey
        const publicKey = new PublicKey(pubKey);

        // Try RPCs in order
        for (const endpoint of RPC_ENDPOINTS) {
            try {
                const connection = new Connection(endpoint, "confirmed");
                const balance = await connection.getBalance(publicKey);
                return balance / 1e9; // Convert lamports → SOL
            } catch (err) {
                console.warn(`⚠️ Failed to fetch from ${endpoint}, trying next...`, err);
            }
        }

        throw new Error("All RPC endpoints failed");
    } catch (err) {
        console.error("❌ getUserSOLBalance error:", err);
        return 0; // fallback so API doesn’t break
    }
}
