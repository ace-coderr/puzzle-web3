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
    (seed: number) => `https://loremflickr.com/800/480/painting,graphic?lock=${seed}`,
    (seed: number) => `https://placehold.co/800x480/png?text=Art+${seed}`,
    (seed: number) => `https://placekitten.com/800/480?image=${seed % 16}`,
    (seed: number) => `https://placebear.com/800/480?bear=${seed}`,
    (seed: number) => `https://placebeard.it/800x480?seed=${seed}`,
    (seed: number) => `https://random.imagecdn.app/800/480?seed=${seed}`,
    (seed: number) => `https://picsum.photos/800/480?random=${seed}`,
] as const;


/* -------------------------------------------------------------
   MAIN COMPONENT
   ------------------------------------------------------------- */
export function PositionElements() {
    const { publicKey, connected } = useWallet();
    const router = useRouter();
    const { playWin, playLose, playClaim } = useGameSounds();

    // CORE STATES
    const [imageUrl, setImageUrl] = useState<string>("/images/preview.jpg");
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [draggedTile, setDraggedTile] = useState<Tile | null>(null);
    const [moveCount, setMoveCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isWin, setIsWin] = useState<boolean>(false);
    const [time, setTime] = useState<number>(0);
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [showStartModal, setShowStartModal] = useState(false);
    const [bidStarted, setBidStarted] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [gameActive, setGameActive] = useState(false);
    const [finalTime, setFinalTime] = useState<number>(0);

    // Session-based used seeds to prevent repeats
    const [usedSeeds, setUsedSeeds] = useState<Set<number>>(new Set());

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
    const handleRandomImage = () => {
        let seed: number = 0;

        do {
            seed = Date.now() + Math.floor(Math.random() * 1_000_000);
        } while (usedSeeds.has(seed));

        setUsedSeeds(prev => {
            const next = new Set(prev);
            next.add(seed);

            if (next.size > 200) {
                const oldest = next.keys().next().value;
                if (oldest !== undefined) {
                    next.delete(oldest);
                }
            }

            return next;
        });

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
    const handleRestart = () => {
        setCurrentBid(0);
        setBidStarted(false);
        setShowStartModal(false);

        setImageUrl("/images/preview.jpg");
        setTiles(generateTiles("/images/preview.jpg"));
        setMoveCount(0);
        setTime(0);
        setFinalTime(0);
        setIsWin(false);
        setIsGameOver(false);
        setGameActive(false);
        setTimerActive(false);
    };


    useEffect(() => {
        setImageUrl("/images/preview.jpg");
        setTiles(generateTiles("/images/preview.jpg"));
    }, [])

    useEffect(() => {
        const handler = (e: any) => {
            const { amount, gameId } = e.detail || {};
            if (gameId) localStorage.setItem("currentGameId", gameId);

            setCurrentBid(amount || 0);

            if (amount > 0) {
                handleRandomImage();
            } else {
                setImageUrl("/images/preview.jpg");
                setTiles(generateTiles("/images/preview.jpg"));
            }

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

    /* -------------------------------------------------------------
     RENDER
     ------------------------------------------------------------- */
    return (
        <>
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
                <br />

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