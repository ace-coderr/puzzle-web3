import { Connection, PublicKey } from "@solana/web3.js";

const FALLBACK_RPC_ENDPOINTS = [
    "https://api.devnet.solana.com",
    "https://rpc.ankr.com/solana_devnet",
    "https://solana-devnet.g.alchemy.com/v2/demo",
    "https://solana-devnet-rpc.allthatnode.com",
] as const;

export async function getUserSOLBalance(pubKey: string): Promise<number> {
    try {
        const publicKey = new PublicKey(pubKey);
        const endpoints = [
            process.env.NEXT_PUBLIC_SOLANA_RPC,
            process.env.NEXT_PUBLIC_RPC_URL,
            process.env.RPC_URL,
            ...FALLBACK_RPC_ENDPOINTS,
        ].filter((url): url is string => Boolean(url));

        if (endpoints.length === 0) throw new Error("No RPCs");

        for (const [i, endpoint] of endpoints.entries()) {
            try {
                const connection = new Connection(endpoint, "confirmed");
                const lamports = await connection.getBalance(publicKey);
                console.log(`Balance from [${i + 1}]: ${endpoint}`);
                return lamports / 1e9;
            } catch (err) {
                console.warn(`RPC ${i + 1} failed: ${endpoint}`);
            }
        }
        throw new Error("All RPCs failed");
    } catch (err) {
        console.error("getUserSOLBalance error:", err);
        return 0;
    }
}