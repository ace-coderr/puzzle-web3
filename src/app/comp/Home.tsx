"use client"

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import "./css/style.css"
import { PositionElements } from "./positionElements";
import { getUserSOLBalance } from "./GetUserBalance";
import { Navbar } from "./Navbar";
import BidComponent from "./bid";
import RecentActivity from "./recentActivity";
import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction
} from "@solana/web3.js";


const GAME_VAULT = "Ebc5cNzxSe1DTaq6MDPFjzVmj2EUFPvpcVnFGU7jCSpq";
const SOLANA_RPC_URL = "https://api.devnet.solana.com";

export function HomeComponent() {
    const wallet = useWallet();
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!wallet.publicKey) return;

        const loadUserAndBalance = async () => {
            const walletAddress = wallet.publicKey!.toBase58();

            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });

            const solBalance = await getUserSOLBalance(walletAddress);
            setUserBalance(solBalance);

            await fetch(`/api/users/${walletAddress}/balance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: solBalance })
            });
        };

        loadUserAndBalance();
    }, [wallet.publicKey]);

    const handlePlaceBid = async (amount: number) => {
        if (!wallet.publicKey) return alert("Please connect your wallet");
        if (amount <= 0) return alert("Enter a valid bid amount");

        try {
            const connection = new Connection(SOLANA_RPC_URL, "confirmed");
            const lamports = Math.floor(amount * 1e9);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey!,
                    toPubkey: new PublicKey(GAME_VAULT),
                    lamports
                })
            );

            const signature = await wallet.sendTransaction(transaction, connection);
            const confirmation = await connection.confirmTransaction(signature, "confirmed");
            let status = "PENDING";

            if (!confirmation.value.err) {
                status = "SUCCESS";
            } else if (confirmation.value.err) {
                status = "FAILED";
            }

            const newBalance = await getUserSOLBalance(wallet.publicKey!.toBase58());
            setUserBalance(newBalance);

            const res = await fetch("/api/bids", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    walletAddress: wallet.publicKey!.toBase58(),
                    txSignature: signature,
                    status
                }),
            });

            if (res.ok) {
                alert("Bid placed successfully");
                document.dispatchEvent(new Event("puzzle-restart"));
            } else {
                alert("Failed to place bid");
            }
        } catch (error) {
            console.error(error);
            alert("Error placing bid. Please try again.");
        }
    }

    if (!hasMounted) return null;

    return (
        <div>
            <Navbar balance={userBalance} />
            <PositionElements />

            {wallet.publicKey ? (
                <div className="flex justify-center gap-10 mt-10">
                    <BidComponent onBid={handlePlaceBid} />
                    <RecentActivity />
                </div>
            ) : (
                <div className="mt-10 text-center text-white text-lg">
                    Please connect your wallet to start bidding.
                </div>
            )}
        </div>
    );
}
export default HomeComponent;