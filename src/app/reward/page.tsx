"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import Modal from "../components/modal";
import confetti from "canvas-confetti";

type GameResult = {
  id: string;
  won: boolean;
  moves: number;
  time: number;
  bidding: number;
  reward?: number;
  claimed: boolean;
  difficulty: string;
  createdAt: string;
};

export default function RewardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; amount?: string; tx?: string }>({
    open: false,
  });

  useEffect(() => {
    if (!publicKey) return;
    fetchHistory();
  }, [publicKey]);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await fetch(`/api/game-results?walletAddress=${publicKey!.toBase58()}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  };

  const handleClaim = async (gameId: string) => {
    setClaiming(gameId);
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, walletAddress: publicKey!.toBase58() }),
    });

    const data = await res.json();

    confetti({
      particleCount: 140,
      spread: 70,
      origin: { y: 0.65 },
    });

    setModal({ open: true, amount: data.amount, tx: data.txSignature });
    setClaiming(null);
    fetchHistory();
  };

  if (!publicKey)
    return <div className="centered">Connect wallet to view rewards</div>;

  if (loading)
    return <div className="centered">Loading rewards...</div>;

  const unclaimed = results.filter(r => r.won && r.reward && !r.claimed);
  const wins = results.filter(r => r.won && r.claimed);
  const losses = results.filter(r => !r.won);

  return (
    <main className="reward-page">
      <div className="reward-container">

        {/* UNCLAIMED */}
        {unclaimed.length > 0 && (
          <section>
            <h2 className="section-title">Unclaimed Rewards ({unclaimed.length})</h2>
            {unclaimed.map(r => (
              <RewardRow
                key={r.id}
                result={r}
                action={
                  <button
                    className="claim-btn"
                    disabled={claiming === r.id}
                    onClick={() => handleClaim(r.id)}
                  >
                    {claiming === r.id ? "Claiming..." : "Claim"}
                  </button>
                }
              />
            ))}
          </section>
        )}

        {/* WINS */}
        <section>
          <h2 className="section-title green">Wins ({wins.length})</h2>
          {wins.map(r => (
            <RewardRow
              key={r.id}
              result={r}
              action={
                <div className="row-info">
                  <span className="amount">+{r.reward} SOL</span>
                  <span className="date">{new Date(r.createdAt).toLocaleDateString()}</span>
                  <span className="claimed-status">Claimed</span>
                </div>
              }
            />
          ))}
        </section>

        {/* LOSSES */}
        <section>
          <h2 className="section-title red">Losses ({losses.length})</h2>
          {losses.map(r => (
            <RewardRow
              key={r.id}
              result={r}
              action={
                <div className="row-info">
                  <span className="amount">-{r.bidding} SOL</span>
                  <span className="date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              }
            />
          ))}
        </section>
      </div>

      {/* SUCCESS MODAL */}
      <Modal
        show={modal.open}
        title="Reward Claimed!"
        variant="success"
        hideFooter
        onClose={() => setModal({ open: false })}
      >
        <div className="modal-content">
          <p className="modal-amount">+{modal.amount} SOL</p>
          <p className="tx">{modal.tx}</p>
          {modal.tx && (
            <a
              href={`https://orb.helius.xyz/tx/${modal.tx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on Orb Explorer
            </a>
          )}
        </div>
      </Modal>
    </main>
  );
}

/* ---------------- ROW COMPONENT ---------------- */

function RewardRow({
  result,
  action,
}: {
  result: GameResult;
  action?: React.ReactNode;
}) {
  return (
    <div className={`reward-row ${result.won ? "win" : "lose"}`}>
      <div className="status">{result.won ? "WIN" : "LOSE"}</div>
      <div className="meta">
        {result.moves} moves • {result.time}s • Bid {result.bidding} SOL
      </div>
      <div className="action">{action}</div>
    </div>
  );
}
