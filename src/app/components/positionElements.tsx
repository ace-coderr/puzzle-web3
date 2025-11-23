"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./modal";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameSounds } from "@/hooks/useGameSounds";

export type Tile = {
    id: number;
    x: number;
    y: number;
    bgX: number;
    bgY: number;
};

/* -------------------------------------------------------------
   SAVE RESULT
   ------------------------------------------------------------- */
async function saveResult(
    result: "WIN" | "LOSE",
    opts: {
        walletAddress?: string;
        moves: number;
        time: number;
        bidding: number;
        difficulty?: string;
    }
) {
    if (!opts.walletAddress) return;
    const gameId = localStorage.getItem("currentGameId");
    if (!gameId) return;

    try {
        const res = await fetch("/api/game-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                walletAddress: opts.walletAddress,
                moves: opts.moves,
                time: opts.time,
                bidding: opts.bidding,
                won: result === "WIN",
                gameId,
                difficulty: opts.difficulty,
            }),
        });
        document.dispatchEvent(new CustomEvent("recent-activity-refresh"));
    } catch (err: any) {
        console.error("saveResult failed:", err.message);
    }
}

/* -------------------------------------------------------------
   SHUFFLE HELPER
   ------------------------------------------------------------- */
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* -------------------------------------------------------------
   INFINITE IMAGE SOURCES — NEVER REPEATS
   ------------------------------------------------------------- */
const IMAGE_SOURCES = [
    (seed: number) => `https://picsum.photos/seed/${seed}/800/480`,
    (seed: number) => `https://source.unsplash.com/random/800x480?sig=${seed}`,
    (seed: number) => `https://loremflickr.com/800/480/abstract,art,texture?random=${seed}`,
    (seed: number) => `https://picsum.photos/seed/art${seed}/800/480`,
    (seed: number) => `https://source.unsplash.com/random/800x480/?nature,landscape&sig=${seed}`,
    (seed: number) => `https://api.dicebear.com/7.x/shapes/jpg?seed=${seed}&size=800`,
] as const;

/* -------------------------------------------------------------
   MAIN COMPONENT
   ------------------------------------------------------------- */
export function PositionElements({ onRetry }: { onRetry?: () => void }) {
    const { publicKey, connected } = useWallet();
    const router = useRouter();
    const { playWin, playLose, playClaim } = useGameSounds();

    // CORE STATES
    const [imageUrl, setImageUrl] = useState<string>("/images/wall.jpg");
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [draggedTile, setDraggedTile] = useState<Tile | null>(null);
    const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
    const [moveCount, setMoveCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isWin, setIsWin] = useState<boolean>(false);
    const [time, setTime] = useState<number>(0);
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
    const [resultSaved, setResultSaved] = useState<boolean>(false);
    const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
    const [leaderboardData, setLeaderboardData] = useState<any>(null);
    const [loadingLB, setLoadingLB] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [showStartModal, setShowStartModal] = useState(false);
    const [bidStarted, setBidStarted] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [gameActive, setGameActive] = useState(false);
    const [finalTime, setFinalTime] = useState<number>(0);

    // Session-based used seeds to prevent repeats
    const [usedSeeds] = useState<Set<number>>(new Set());

    /* ---------- Difficulty ---------- */
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [maxMoves, setMaxMoves] = useState(30);
    const [maxTime, setMaxTime] = useState(90);
    const [rewardMultiplier, setRewardMultiplier] = useState(1.5);

    const difficulties = [
        { level: 'easy' as const, moves: 40, time: 180 },
        { level: 'medium' as const, moves: 30, time: 90 },
        { level: 'hard' as const, moves: 20, time: 60 },
    ] as const;

    useEffect(() => {
        const d = difficulties.find(d => d.level === difficulty)!;
        setMaxMoves(d.moves);
        setMaxTime(d.time);
        setRewardMultiplier(d.level === 'easy' ? 1.2 : d.level === 'medium' ? 1.5 : 2.5);
    }, [difficulty]);

    /* ---------- Tile generation ---------- */
    function generateTiles(imageUrl: string): Tile[] {
        const leftPositions = [0, 8, 16, 24, 32];
        const topPositions = [0, 6, 12, 18];
        const bgPositions: [number, number][] = [];
        for (let y of topPositions) {
            for (let x of leftPositions) {
                bgPositions.push([x, y]);
            }
        }
        const shuffled = shuffleArray(bgPositions);
        return bgPositions.map(([bgX, bgY], i) => {
            const [x, y] = shuffled[i];
            return { id: i, x, y, bgX, bgY };
        });
    }


    /* ---------- Init default puzzle ---------- */
    useEffect(() => {
        const defaultImage = "/images/wall.jpg";
        setTiles(generateTiles(defaultImage));
    }, []);


    /* ---------- Win / Lose detection ---------- */
    useEffect(() => {
        if (!tiles.length || !gameActive) return;

        const won = tiles.every(t => t.x === t.bgX && t.y === t.bgY);

        if (won) {
            setGameActive(false);
            setFinalTime(time);
            setIsWin(true);
            playWin();
            saveResult("WIN", {
                walletAddress: publicKey?.toString(),
                moves: moveCount,
                time: time,
                bidding: currentBid,
                difficulty
            });
        } else if (moveCount >= maxMoves || time >= maxTime) {
            setIsGameOver(true);
            setGameActive(false);
            playLose();
            saveResult("LOSE", { walletAddress: publicKey?.toString(), moves: moveCount, time, bidding: currentBid, difficulty });
        }
    }, [tiles, moveCount, time, gameActive]);


    /* ---------- Timer ---------- */
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (!gameActive) {
            setTime(0);
            return;
        }

        const interval = setInterval(() => {
            setTime((t) => {
                if (t + 1 >= maxTime) {
                    clearInterval(interval);
                    setGameActive(false);
                    setIsGameOver(true);
                    return maxTime;
                }
                return t + 1;
            });
        }, 1000);

        timerIntervalRef.current = interval;
        return () => clearInterval(interval);
    }, [timerActive, gameActive, maxTime]);


    /* ---------- Image helpers ---------- */
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            setTiles(generateTiles(url));
        }
    };

    const handleRandomImage = () => {
        let seed: number;
        do {
            seed = Date.now() + Math.floor(Math.random() * 1_000_000);
        } while (usedSeeds.has(seed));

        usedSeeds.add(seed);

        const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
        const url = source(seed);

        setImageUrl(url);
        setTiles(generateTiles(url));
    };

    // DRAG & DROP
    const handleDragStart = (tile: Tile) => {
        if (!gameActive) return;
        setDraggedTile(tile);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, target: Tile) => {
        e.preventDefault();
        if (!gameActive || !draggedTile) return;

        setTiles(tiles.map(t =>
            t.id === draggedTile.id ? { ...t, x: target.x, y: target.y } :
                t.id === target.id ? { ...t, x: draggedTile.x, y: draggedTile.y } : t
        ));
        setDraggedTile(null);
        setMoveCount(c => c + 1);
    };

    // RESTART
    const handleRestart = (img?: string) => {
        const url = img || `https://picsum.photos/seed/${Date.now()}/800/480`;
        setImageUrl(url);
        setTiles(generateTiles(url));
        setMoveCount(0);
        setTime(0);
        setFinalTime(0);
        setIsWin(false);
        setIsGameOver(false);
    };

    useEffect(() => {
        const handler = (e: any) => {
            const { amount, gameId } = e.detail || {};
            if (gameId) localStorage.setItem("currentGameId", gameId);
            setCurrentBid(amount || 0);
            handleRestart();
            setBidStarted(true);
            setShowStartModal(true);
            setGameActive(false);
            setTimerActive(false);
            setTime(0);
            setMoveCount(0);
        };
        document.addEventListener("puzzle-restart", handler);
        return () => document.removeEventListener("puzzle-restart", handler);
    }, []);

    /* ---------- Leaderboard Fetch ---------- */
    useEffect(() => {
        if (!showLeaderboard || !walletAddress) return;
        const fetchLB = async () => {
            setLoadingLB(true);
            try {
                const res = await fetch("/api/leaderboard", {
                    headers: { "x-wallet-address": walletAddress },
                    cache: "no-store",
                });
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                setLeaderboardData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingLB(false);
            }
        };
        fetchLB();
        const int = setInterval(fetchLB, 30000);
        return () => clearInterval(int);
    }, [showLeaderboard, walletAddress]);


    /* -------------------------------------------------------------
     RENDER
     ------------------------------------------------------------- */
    return (
        <>
            {/* LEADERBOARD MODAL */}
            <Modal
                title="Leaderboard"
                show={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                variant="leaderboard"
            >
                {loadingLB ? (
                    <p className="text-center py-8 text-gray-400">Loading...</p>
                ) : (
                    <>
                        {/* Your Rank */}
                        {leaderboardData?.myRank && (
                            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-5 rounded-xl mb-6 text-white shadow-lg">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center text-3xl font-bold">
                                            #{leaderboardData.myRank.rank}
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">YOU</p>
                                            <p className="font-mono text-sm">{leaderboardData.myRank.wallet}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl">{leaderboardData.myRank.wins} Wins</p>
                                        <p className="text-lg">{leaderboardData.myRank.totalBid.toString().replace(/\.?0+$/, '')} SOL</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Global List */}
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                            {leaderboardData?.leaderboard?.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No wins yet</p>
                            ) : (
                                leaderboardData?.leaderboard?.map((e: any) => (
                                    <div
                                        key={e.rank}
                                        className={`flex justify-between items-center p-3 rounded-lg transition ${e.isMe ? "bg-yellow-900/40 border-l-4 border-yellow-400" : "bg-slate-800"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${e.rank === 1
                                                    ? "bg-yellow-400 text-black"
                                                    : e.rank === 2
                                                        ? "bg-gray-400 text-black"
                                                        : e.rank === 3
                                                            ? "bg-orange-600 text-white"
                                                            : "bg-slate-600 text-white"
                                                    }`}
                                            >
                                                {e.rank}
                                            </div>
                                            <span className="font-mono text-sm truncate max-w-[120px]">{e.wallet}</span>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div className="font-bold">{e.wins} Wins</div>
                                            <div className="text-green-400">{e.totalBid.toFixed(3)} SOL</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-6">Updates every 30s</p>
                    </>
                )}
            </Modal>

            {/* ----- Difficulty picker ----- */}
            {connected && (
                <div className="flex justify-center gap-3 mt-4 mb-2">
                    {difficulties.map(d => {
                        const multiplier = d.level === 'easy' ? '1.2x' : d.level === 'medium' ? '1.5x' : '2.5x';
                        return (
                            <button
                                key={d.level}
                                onClick={() => setDifficulty(d.level)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${difficulty === d.level
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                <span>{d.level.toUpperCase()}</span>
                                <span className="text-xs opacity-80">• {multiplier}</span>
                            </button>
                        );
                    })}
                </div>
            )}


            {/* ----- Counters ----- */}
            <div className="flex justify-center gap-10 mt-4 text-xl font-semibold text-white time-count">
                <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow">Moves: {moveCount} / {maxMoves}</p>
                <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow">Time: {time}s / {maxTime}s</p>
            </div>

            {/* ----- Puzzle board ----- */}
            <div className="relative w-[40vw] h-[24vw] overflow-hidden stylle">
                {tiles.map((tile) => (
                    <div
                        key={tile.id}
                        className="absolute w-[8vw] h-[6vw] box-border"
                        draggable={currentBid > 0}
                        onDragStart={() => currentBid > 0 && handleDragStart(tile)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, tile)}
                        style={{
                            left: `${tile.x}vw`,
                            top: `${tile.y}vw`,
                            backgroundImage: `url(${imageUrl})`,
                            backgroundPosition: `-${tile.bgX}vw -${tile.bgY}vw`,
                            backgroundSize: `40vw 24vw`,
                            backgroundRepeat: 'no-repeat',
                            border: hoveredTile?.id === tile.id ? '2px dashed red' : 'none',
                            opacity: draggedTile?.id === tile.id ? 0.5 : (currentBid > 0 ? 1 : 0.6),
                            filter: currentBid === 0 ? 'grayscale(100%) brightness(0.7)' : 'none',
                            boxShadow: draggedTile?.id === tile.id
                                ? '0 0 60px rgba(16, 185, 129, 0.8)'
                                : '0 4px 16px rgba(0, 0, 0, 0.35)',
                        }}
                    />
                ))}

                {!gameActive && (
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-10 rounded-3xl">
                        <div className="text-center animate-pulse">
                            <div className="text-9xl mb-10">Locked</div>
                            <p className="text-7xl font-black text-white mb-6">
                                {currentBid === 0 ? "PLACE BID TO PLAY" : "GAME OVER"}
                            </p>
                            <p className="text-4xl text-emerald-400 font-bold">
                                {currentBid === 0 ? "No free moves." : "Bid again to continue."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ----- Original image + image controls ----- */}
            <div className="flex flex-col items-center gap-4 p-4">
                <div>
                    <br />
                    <img src={imageUrl} alt="Original" className="w-[20vw] h-auto border rounded shadow" />
                </div>


                {/* Image controls only before a bid */}
                {!bidStarted && (
                    <div className="flex gap-4 transition-opacity duration-500 ran-upl" style={{ opacity: bidStarted ? 0 : 1 }}>
                        <button onClick={handleRandomImage} className="bg-gray-900 hover:bg-gray-400 transition random-btn">
                            Random Image
                        </button>
                        <button onClick={() => inputRef.current?.click()} className="bg-gray-900 hover:bg-gray-400 transition random-btn">
                            Upload Image
                        </button>
                        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    </div>
                )}

                {/* ---------- MODALS ---------- */}
                {/* BID CONFIRMED */}
                <Modal
                    show={showStartModal}
                    title="BID LOCKED"
                    variant="start"
                    hideCloseButton={true}
                    confirmText="START GAME"
                    onConfirm={() => {
                        setShowStartModal(false);
                        setGameActive(true);
                        setTimerActive(true);
                    }}
                >
                    <div className="text-center py-16">
                        <div className="text-9xl font-black text-emerald-400 leading-tight tracking-tight">
                            {currentBid.toString().replace(/\.?0+$/, '')} SOL
                        </div>

                        <p className="text-2xl text-white mt-12 font-semibold">
                            Your bid is locked.
                        </p>
                        <p className="text-xl text-gray-300 mt-4">
                            {maxMoves} moves • {maxTime}s • {rewardMultiplier}x reward
                        </p>
                        <p className="text-lg text-red-400 font-bold mt-10">
                            No refunds. Click when ready.
                        </p>
                    </div>
                </Modal>

                {/* Victory */}
                <Modal
                    show={isWin}
                    title="PUZZLE VICTORY"
                    variant="success"
                    hideCloseButton={true}
                    confirmText="CLAIM REWARD"
                    onConfirm={() => router.push("/reward")}
                    onClose={handleRestart}
                    singleButton={true}
                >
                    <div className="text-center py-12">
                        <p className="text-8xl font-black text-emerald-400 drop-shadow-2xl leading-none animate-pulse">
                            {((currentBid * rewardMultiplier).toString().replace(/\.?0+$/, ''))}
                        </p>
                        <p className="text-5xl font-bold text-emerald-300 -mt-4 mb-10">
                            SOL REWARD
                        </p>

                        <div className="space-y-4 text-white">
                            <p className="font-bold">
                                Completed in <span className="text-emerald-400">{moveCount}</span> Moves - Time: <span className="text-emerald-400">{finalTime}s</span>
                            </p>
                        </div>

                        <p className="text-lg text-gray-400 mt-8 font-medium">
                            Reward processed instantly • No fees • Real wins
                        </p>
                    </div>
                </Modal>

                {/* Game Over */}
                <Modal
                    title="Game Over"
                    message="Out of moves or time!"
                    show={isGameOver}
                    onClose={handleRestart}
                    singleButton={true}
                />
            </div>
        </>
    );
}