"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Modal from "../components/modal";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

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
  const { playClaim, unlockAudio } = useGameSounds();

  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; amount?: string; tx?: string }>({
    open: false,
  });

  // Unlock audio on component mount
  useEffect(() => {
    unlockAudio();
  }, [unlockAudio]);

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

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, walletAddress: publicKey!.toBase58() }),
      });

      if (!res.ok) {
        throw new Error(`Claim failed: ${res.status}`);
      }

      const data = await res.json();

      // Play claim sound
      playClaim();

      // Trigger confetti
      confetti({
        particleCount: 140,
        spread: 70,
        origin: { y: 0.65 },
      });

      // Show success modal
      setModal({
        open: true,
        amount: data.amount,
        tx: data.txSignature
      });

      // Refresh the list
      fetchHistory();

    } catch (error) {
      console.error("Claim error:", error);
      // Optionally show an error message here
    } finally {
      setClaiming(null);
    }
  };

  // Add click sound for claim button
  const handleClaimClick = (gameId: string) => {
    unlockAudio();
    handleClaim(gameId);
  };

  if (!publicKey) return <div className="centered">Connect wallet to view rewards</div>;
  if (loading) return <div className="centered">Loading rewards...</div>;

  // Top 20 most recent games
  const recentGames = results
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return (
    <main className="reward-page">
      <div className="reward-container">
        <section>
          <h2 className="section-title">Recent Games (Top 20)</h2>
          {recentGames.map((r) => (
            <RewardRow
              key={r.id}
              result={r}
              action={
                <div className="row-info">
                  {r.won ? (
                    <>
                      <span className="amount">+{r.reward ?? 0} SOL</span>
                      {!r.claimed && r.reward && r.reward > 0 && (
                        <button
                          className="claim-btn"
                          disabled={claiming === r.id}
                          onClick={() => handleClaimClick(r.id)}
                        >
                          {claiming === r.id ? "Claiming..." : "Claim"}
                        </button>
                      )}
                      {r.claimed && <span className="claimed-status">Claimed</span>}
                    </>
                  ) : (
                    <span className="amount">-{r.bidding} SOL</span>
                  )}
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
        onClose={() => setModal({ open: false })}
      >
        <div className="confirm-details" style={{ alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#3cff8f",
                marginBottom: 8,
              }}
            >
              +{Number(modal.amount || 0)
                .toFixed(6)
                .replace(/\.?0+$/, "")}{" "}
              SOL
            </div>

            <div style={{ fontSize: 14, color: "#bdbdbd" }}>
              Reward successfully claimed!
            </div>
          </div>
        </div>

        {modal.tx && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <a
              href={`https://orb.helius.xyz/tx/${modal.tx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: "#3cff8f",
                textDecoration: "underline",
              }}
            >
              View on Orb Explorer
            </a>
          </div>
        )}

        <div className="confirm-actions">
          <button
            className="btn confirm"
            onClick={() => setModal({ open: false })}
          >
            OK
          </button>
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
        {result.time}s • Bid {result.bidding} SOL
      </div>
      <div className="action">{action}</div>
    </div>
  );
}