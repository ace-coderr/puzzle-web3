import crypto from "crypto";
import { Keypair } from "@solana/web3.js";

export function decryptRewardWallet(): Uint8Array {
    if (!process.env.REWARD_WALLET_SECRET_ENCRYPTED || !process.env.WALLET_ENCRYPTION_KEY)
        throw new Error("Missing env vars");

    const encrypted = JSON.parse(process.env.REWARD_WALLET_SECRET_ENCRYPTED);
    const key = Buffer.from(process.env.WALLET_ENCRYPTION_KEY, "hex");
    if (key.length !== 32) throw new Error("AES key must be 32 bytes");

    const iv = Buffer.from(encrypted.iv, "hex");
    const tag = Buffer.from(encrypted.tag, "hex");
    const data = Buffer.from(encrypted.data, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    if (decrypted.length !== 64) throw new Error("Invalid Solana secret key length");

    return new Uint8Array(decrypted);
}

export function getRewardKeypair(): Keypair {
    return Keypair.fromSecretKey(decryptRewardWallet());
}