import crypto from "crypto";

if (!process.env.WALLET_ENCRYPTION_KEY) {
    throw new Error("WALLET_ENCRYPTION_KEY missing");
}

const ENCRYPTION_KEY = Buffer.from(
    process.env.WALLET_ENCRYPTION_KEY,
    "hex"
);

// SOLANA PRIVATE KEY
const secretKey = Uint8Array.from([
    [107, 117, 255, 236, 196, 216, 159, 140, 56, 36, 215, 192, 231, 44, 237, 177, 248, 97, 59, 216, 43, 88, 171, 189, 109, 39, 145, 45, 151, 136, 189, 144, 202, 5, 87, 144, 125, 161, 39, 212, 222, 101, 5, 38, 207, 213, 112, 33, 53, 134, 245, 142, 219, 206, 242, 230, 150, 36, 249, 178, 185, 103, 247, 178]


]);

const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final()
]);

const tag = cipher.getAuthTag();

console.log(JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
}));