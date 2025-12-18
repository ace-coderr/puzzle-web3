"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
// @ts-ignore
import "./css/style.css";
import { PositionElements } from "./positionElements";
import BidComponent from "./bids";
import RecentActivity from "./recentBids";

export default function HomeComponent() {
  const wallet = useWallet();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => setHasMounted(true), []);

  if (!hasMounted) return null;

  return (
    <div>
      <PositionElements />

      {wallet.publicKey ? (
        <div className="flex justify-center  gap-10 mt-10">
          <BidComponent wallet={wallet} />
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