import 'dotenv/config';
import crypto from "crypto";

// Load AES key from .env
const ENCRYPTION_KEY = Buffer.from(process.env.WALLET_ENCRYPTION_KEY, "hex");
if (ENCRYPTION_KEY.length !== 32) throw new Error("AES key must be 32 bytes");

// Your Solana private key (64 bytes)
const secretKey = Uint8Array.from([
    107, 117, 255, 236, 196, 216, 159, 140, 56, 36, 215, 192, 231, 44, 237, 177,
    248, 97, 59, 216, 43, 88, 171, 189, 109, 39, 145, 45, 151, 136, 189, 144,
    202, 5, 87, 144, 125, 161, 39, 212, 222, 101, 5, 38, 207, 213, 112, 33,
    53, 134, 245, 142, 219, 206, 242, 230, 150, 36, 249, 178, 185, 103, 247, 178
]);

// Encrypt with AES-256-GCM
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
const encrypted = Buffer.concat([cipher.update(Buffer.from(secretKey)), cipher.final()]);
const tag = cipher.getAuthTag();

// Output ready for .env
console.log("REWARD_WALLET_SECRET_ENCRYPTED=" + JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex")
}));