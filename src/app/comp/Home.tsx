"use client"

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import "./css/style.css"
import { PositionElements } from "./positionElements";
import { getUserSOLBalance } from "./GetUserBalance";
import { sendSolToVault } from "./SendSolToVault";
import { Navbar } from "./Navbar";

const GAME_VAULT = "HHS9PDUQWG7o1pw5MpdmjQ8vjaNwPE6TU2M2GLuR7ox7";

export function HomeComponent() {

    const wallet = useWallet();
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [depositedAmount, setDeposited] = useState<number>(0);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (wallet.publicKey) {
            getUserSOLBalance(wallet.publicKey.toBase58()).then(setUserBalance);
        }
    }, [wallet.publicKey]);

    const handleDeposit = async (amount: number) => {
        try {
            const tx = await sendSolToVault(wallet, amount, GAME_VAULT);
            alert("✅ Deposit successful!\nTx:" + tx);

            if (wallet.publicKey) {
                getUserSOLBalance(wallet.publicKey.toBase58()).then(setUserBalance);
                setDeposited(prev => prev + amount)
            }
        } catch (err: unknown) {
            console.error("Deposit failed:", err);
            if (err instanceof Error) {
                alert("❌ Deposit failed:" + err.message);
            } else {
                alert("❌ Deposit failed: Unknown error occured.")
            }
        }
    };

    if (!hasMounted) return null;

    return (
        <div>
            <Navbar
                onDeposit={handleDeposit}
                balance={userBalance}
                deposited={depositedAmount}
            />
            <PositionElements />
        </div>
    );
}
export default HomeComponent;