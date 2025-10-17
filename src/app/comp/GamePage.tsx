"use client";

import { useState, useEffect } from "react";
import BidComponent from "./bid";
import { PositionElements } from "./positionElements";

export default function GamePage({ wallet }: { wallet: any }) {
  const [isGameActive, setIsGameActive] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // When a successful bid happens, start the game
  useEffect(() => {
    const startListener = () => setIsGameActive(true);
    document.addEventListener("puzzle-restart", startListener);

    return () => document.removeEventListener("puzzle-restart", startListener);
  }, []);

  // When the game ends (retry pressed), go back to bid screen
  const handleRetry = () => {
    setIsGameActive(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8">
      {!isGameActive ? (
        <BidComponent
          wallet={wallet}
          onBalanceUpdate={(bal) => setWalletBalance(bal)}
        />
      ) : (
        <PositionElements onRetry={handleRetry} />
      )}
    </div>
  );
}