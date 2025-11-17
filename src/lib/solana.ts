import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const RPC_URL = process.env.RPC_URL!;
const FALLBACK_RPCS = [
    process.env.NEXT_PUBLIC_FALLBACK_RPC_1,
    process.env.NEXT_PUBLIC_FALLBACK_RPC_2,
].filter(Boolean) as string[];

let connection: Connection | null = null;

export function getConnection(): Connection {
    if (connection) return connection;

    const urls = [RPC_URL, ...FALLBACK_RPCS];
    connection = new Connection(urls[0], "confirmed");

    // Auto-fallback on error
    const originalRequest = (connection as any)._rpcRequest;
    (connection as any)._rpcRequest = async function (method: string, args: any[]) {
        for (const url of urls) {
            try {
                (this as any)._rpcEndpoint = url;
                return await (originalRequest as any).apply(this, [method, args]);
            } catch (err) {
                console.warn(`RPC failed: ${url}, trying next...`);
            }
        }
        throw new Error("All RPCs failed");
    };

    return connection;
}

export const getServerWallet = (): Keypair => {
    const secret = JSON.parse(process.env.SOLANA_SERVER_SECRET_KEY!);
    return Keypair.fromSecretKey(new Uint8Array(secret));
};

export const TREASURY_WALLET = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!);