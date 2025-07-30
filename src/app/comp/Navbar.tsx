'use client'

import { useEffect, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'

interface NavbarProps {
    onDeposit: (amount: number) => void;
    balance: number | null;
    deposited: number;
}

export function Navbar({ onDeposit, balance, deposited}: NavbarProps) {
    const { publicKey } = useWallet();
    const [betAmount, setBetAmount] = useState("0.01");
    // const [isClient, setIsClient] = useState(false);

    // useEffect(() => {
    //     setIsClient(true);
    // })

    const handleDepositClick = () => {
        const parsedAmount = parseFloat(betAmount);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
            onDeposit(parsedAmount)
        } else {
            alert("Please enter a valid deposit amount")
        }
    }

    return (
        <nav className="bg-gray-800 p-4 text-white flex justify-between items-center">
            <div className="text-lg font-bold">🧩 Puzzle Game</div>
            <div className="flex items-center gap-4">
                <WalletMultiButton />
                {publicKey && (
                    <>
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            className="bg-gray-700 px-2 py-1 rounded text-white w-20"
                            min="0.01"
                            step="0.01"
                        />
                        <button
                            onClick={handleDepositClick}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded"
                        >
                            Deposit
                        </button>
                        <div className="text-sm">
                            <p>🏦 Deposited: {deposited.toFixed(4)} SOL</p>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}