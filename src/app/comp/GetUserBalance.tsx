import { Connection, PublicKey } from "@solana/web3.js";

const FALLBACK_RPC_ENDPOINTS = [
    "https://api.devnet.solana.com",
    "https://rpc.ankr.com/solana_devnet",
    "https://solana-devnet.g.alchemy.com/v2/demo"
];

export async function getUserSOLBalance(pubKey: string): Promise<number> {
    try {
        const publicKey = new PublicKey(pubKey);

        // Combine env RPC + fallbacks
        const endpoints = [
            process.env.NEXT_PUBLIC_RPC_URL,
            process.env.RPC_URL,
            ...FALLBACK_RPC_ENDPOINTS
        ].filter(Boolean);

        for (const endpoint of endpoints) {
            try {
                const connection = new Connection(endpoint!, "confirmed");
                const balance = await connection.getBalance(publicKey);
                console.log(`✅ Balance fetched from ${endpoint}`);
                return balance / 1e9;
            } catch (err) {
                console.warn(`⚠️ Failed to fetch from ${endpoint}`, err);
            }
        }

        throw new Error("All RPC endpoints failed");
    } catch (err) {
        console.error("❌ getUserSOLBalance error:", err);
        return 0;
    }
}