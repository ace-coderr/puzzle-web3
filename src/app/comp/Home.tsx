"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import "./css/style.css";
import { PositionElements } from "./positionElements";
import { getUserSOLBalance } from "./GetUserBalance";
import { Navbar } from "./Navbar";
import BidComponent from "./bid";
import RecentActivity from "./recentActivity";

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

            // Ensure user record exists
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });

            // Fetch & update SOL balance
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

    if (!hasMounted) return null;

    return (
        <div>
            <Navbar balance={userBalance} />
            <PositionElements />

            {wallet.publicKey ? (
                <div className="flex justify-center gap-10 mt-10">
                    {/* ✅ Bid logic handled completely inside BidComponent */}
                    <BidComponent
                        wallet={wallet}
                        onBalanceUpdate={setUserBalance}
                    />
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