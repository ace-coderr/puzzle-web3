'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'

interface NavbarProps {
    balance: number | null;
}

export function Navbar({ balance }: NavbarProps) {
    const { publicKey } = useWallet();

    return (
        <nav className="bg-gray-800 p-4 text-white flex justify-between items-center">
            <div className="text-lg font-bold">🧩 Puzzle Game</div>
            <div className="flex items-center gap-4">
                <WalletMultiButton />
                {publicKey && (
                    <div className="text-sm">
                        💰 Balance:{" "}
                        {balance !== null ? balance.toFixed(4) : "Loading..."} SOL
                    </div>
                )}
            </div>
        </nav>
    );
}