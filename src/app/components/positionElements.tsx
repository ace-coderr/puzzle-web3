"use client";

import { useEffect, useRef, useState } from "react";
import { useCallback } from "react";
import Modal from "./modal";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameSounds } from "@/hooks/useGameSounds";
import PracticeModal from "./practiceModal";

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
   INFINITE IMAGE SOURCES
   ------------------------------------------------------------- */
const IMAGE_SOURCES = [
    (seed: number) => `https://picsum.photos/seed/${seed}/800/480`,
    (seed: number) => `https://picsum.photos/seed/${seed}-v2/800/480`,
    (seed: number) => `https://picsum.photos/seed/${seed}-v3/800/480`,
    (seed: number) => `https://picsum.photos/seed/${seed}-blur1/800/480?blur=1`,
    (seed: number) => `https://picsum.photos/seed/${seed}-blur2/800/480?blur=2`,
    (seed: number) => `https://picsum.photos/seed/${seed}-gray/800/480?grayscale`,
    (seed: number) => `https://picsum.photos/seed/${seed}-gray2/800/480?grayscale&blur=1`,
    (seed: number) => `https://picsum.photos/seed/${seed}-gray3/800/480?grayscale&blur=2`,
    (seed: number) => `https://picsum.photos/seed/${seed}-sepia/800/480?sepia`,
    (seed: number) => `https://picsum.photos/seed/${seed}-sepia2/800/480?sepia&blur=1`,
    (seed: number) => `https://picsum.photos/seed/${seed}-contrast/800/480?contrast=2`,
    (seed: number) => `https://picsum.photos/seed/${seed}-contrast2/800/480?contrast=1.5&blur=1`,
] as const;

/* -------------------------------------------------------------
   MAIN COMPONENT
   ------------------------------------------------------------- */
export function PositionElements() {
    const { publicKey, connected } = useWallet();
    const router = useRouter();
    const { playWin, playLose } = useGameSounds();

    // CORE STATES
    const [imageUrl, setImageUrl] = useState<string>("/images/preview.jpg");
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [draggedTile, setDraggedTile] = useState<Tile | null>(null);
    const [moveCount, setMoveCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isWin, setIsWin] = useState<boolean>(false);
    const [time, setTime] = useState<number>(0);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showGameActiveWarning, setShowGameActiveWarning] = useState(false);
    const [bidStarted, setBidStarted] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [gameActive, setGameActive] = useState(false);
    const [finalTime, setFinalTime] = useState<number>(0);

    const [availableSeeds, setAvailableSeeds] = useState<number[]>([]);

    // Practice Mode
    const [practiceMode, setPracticeMode] = useState<boolean>(false);
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [practiceType, setPracticeType] = useState<"start" | "win" | "gameover">("start");
    const [finalPracticeTime, setFinalPracticeTime] = useState<number>(0);

    useEffect(() => {
        const seeds = Array.from({ length: 500 }, (_, i) => i + 1);
        setAvailableSeeds(shuffleArray(seeds));
    }, []);


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
        if (practiceMode) {
            setMaxMoves(40);
            setMaxTime(180);
            setRewardMultiplier(1.2);
            return;
        }

        const d = difficulties.find((d) => d.level === difficulty)!;
        setMaxMoves(d.moves);
        setMaxTime(d.time);
        setRewardMultiplier(
            d.level === "easy" ? 1.2 : d.level === "medium" ? 1.5 : 2.5
        );
    }, [difficulty, practiceMode]);

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

    /* ---------------------- IMAGE & TILE LOADER ---------------------- */
    const loadPuzzleImage = (showModal: boolean = false) => {
        if (availableSeeds.length === 0) {
            console.warn("No more unique images left in this session.");
            return;
        }

        const seedIndex = Math.floor(Math.random() * availableSeeds.length);
        const seed = availableSeeds[seedIndex];
        setAvailableSeeds(prev => prev.filter((_, i) => i !== seedIndex));

        const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
        const url = source(seed);

        const img = new Image();
        img.src = url;
        img.onload = () => {
            setImageUrl(url);
            setTiles(generateTiles(url));
            if (showModal) setShowStartModal(true);
        };
    };

    useEffect(() => {
        if (!tiles.length) return;
        const won = tiles.every(t => t.x === t.bgX && t.y === t.bgY);

        if (practiceMode) {
            if (won) {
                setGameActive(false);
                setFinalPracticeTime(time);
                setPracticeType("win");
                setShowPracticeModal(true);
                playWin();
            } else if (moveCount >= maxMoves || time >= maxTime) {
                setGameActive(false);
                setFinalPracticeTime(time);
                setPracticeType("gameover");
                setShowPracticeModal(true);
                playLose();
            }
        }
        else {
            if (won) {
                setGameActive(false);
                setFinalTime(time);
                setIsWin(true);
                playWin();
                saveResult("WIN", {
                    walletAddress: publicKey?.toString(),
                    moves: moveCount,
                    time,
                    bidding: currentBid,
                    difficulty
                });
            } else if (moveCount >= maxMoves || time >= maxTime) {
                setIsGameOver(true);
                setGameActive(false);
                playLose();
                saveResult("LOSE", {
                    walletAddress: publicKey?.toString(),
                    moves: moveCount,
                    time,
                    bidding: currentBid,
                    difficulty
                });
            }
        }
    }, [tiles, moveCount, time, practiceMode, publicKey, currentBid, difficulty]);

    /* ---------- Timer ---------- */
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (!gameActive) return;

        const interval = setInterval(() => {
            setTime((t) => {
                if (t + 1 >= maxTime) {
                    clearInterval(interval);
                    return maxTime;
                }
                return t + 1;
            });
        }, 1000);

        timerIntervalRef.current = interval;
        return () => clearInterval(interval);
    }, [gameActive, maxTime]);

    // DRAG & DROP
    const handleDragStart = (tile: Tile) => { if (!gameActive) return; setDraggedTile(tile); };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent, target: Tile) => {
        e.preventDefault();
        if (!gameActive || !draggedTile) return;

        setTiles(tiles.map(t =>
            t.id === draggedTile.id ? { ...t, x: target.x, y: target.y } :
                t.id === target.id ? { ...t, x: draggedTile.x, y: draggedTile.y } :
                    t
        ));
        setDraggedTile(null);
        setMoveCount(c => c + 1);
    };

    /* ---------------------- RESTART ---------------------- */
    const handleRestart = () => {
        setCurrentBid(0);
        setBidStarted(false);
        setShowStartModal(false);
        setPracticeMode(false);

        setImageUrl("/images/preview.jpg");
        setTiles(generateTiles("/images/preview.jpg"));
        setMoveCount(0);
        setTime(0);
        setFinalTime(0);
        setIsWin(false);
        setIsGameOver(false);
        setGameActive(false);
    };

    /* ---------- Event Handler for Bid ---------- */
    const handler = useCallback((e: any) => {
        const { amount, gameId, practice, difficulty: incomingDifficulty } = e?.detail || {};

        if (gameId) localStorage.setItem("currentGameId", gameId);
        setPracticeMode(!!practice);
        setCurrentBid(amount || 0);
        setBidStarted(true);
        setGameActive(false);

        if (incomingDifficulty && (incomingDifficulty === 'easy' || incomingDifficulty === 'medium' || incomingDifficulty === 'hard')) {
            setDifficulty(incomingDifficulty);
        }

        if (amount > 0 || practice) {
            loadPuzzleImage(true);
        } else {
            setImageUrl("/images/preview.jpg");
            setTiles(generateTiles("/images/preview.jpg"));
        }

        setTime(0);
        setMoveCount(0);
    }, [availableSeeds, loadPuzzleImage, generateTiles]);

    useEffect(() => {
        document.addEventListener("puzzle-restart", handler);
        return () => document.removeEventListener("puzzle-restart", handler);
    }, [handler, availableSeeds]);

    // Listen for difficulty changes
    useEffect(() => {
        const onDifficultyChange = (e: any) => {
            const newDiff = e?.detail;
            if (newDiff && (newDiff === 'easy' || newDiff === 'medium' || newDiff === 'hard')) {
                setDifficulty(newDiff);
            }
        };
        document.addEventListener("difficulty-change", onDifficultyChange);
        return () => document.removeEventListener("difficulty-change", onDifficultyChange);
    }, []);

    /* -------------------------------------------------------------
     RENDER
     ------------------------------------------------------------- */
    return (
        <>
            {/* ----- Practice Toggle Button ----- */}
            {!practiceMode && (
                <div>
                    <button
                        onClick={() => {
                            if (gameActive) {
                                setShowGameActiveWarning(true);
                                return;
                            }

                            setPracticeMode(true);
                            setDifficulty("easy");
                            setMaxMoves(40);
                            setMaxTime(180);

                            setPracticeType("start");
                            setShowPracticeModal(true);

                            loadPuzzleImage(false);
                            setMoveCount(0);
                            setTime(0);

                            setIsWin(false);
                            setIsGameOver(false);
                            setGameActive(false);
                        }}
                        className="practice-mode1">
                        Practice Mode
                    </button>
                </div>
            )}

            {/* ----- Counters ----- */}
            {gameActive && (
                <div className="flex justify-center gap-10 mt-6 text-xl font-semibold text-white time-count">
                    <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow"> Moves: {moveCount} / {maxMoves} </p>
                    <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow"> Time: {time}s / {maxTime}s </p>
                </div>
            )}

            {/* ----- Puzzle board ----- */}
            <div className="flex justify-center items-center gap-10 mt-12 w-full puzzle-board">
                <div className="relative w-[40vw] h-[24vw] border border-white/10 rounded-xl shadow-xl bg-black/20 overflow-hidden">
                    {(!gameActive && !practiceMode) && (
                        generateTiles("/images/preview.jpg").map((tile) => (
                            <div
                                key={tile.id}
                                className="absolute w-[8vw] h-[6vw] box-border cursor-grab opacity-80"
                                draggable
                                onDragStart={() => { }}
                                style={{
                                    left: `${tile.x}vw`,
                                    top: `${tile.y}vw`,
                                    backgroundImage: 'url("/images/preview.jpg")',
                                    backgroundPosition: `-${tile.bgX}vw -${tile.bgY}vw`,
                                    backgroundSize: `40vw 24vw`,
                                    backgroundRepeat: "no-repeat",
                                    filter: "brightness(0.85)",
                                }}
                            />
                        ))
                    )}

                    {/* ---------- REAL GAME TILES ---------- */}
                    {(gameActive || practiceMode) && tiles.map((tile) => (
                        <div
                            key={tile.id}
                            className="absolute w-[8vw] h-[6vw] box-border"
                            draggable={practiceMode || currentBid > 0}
                            onDragStart={() =>
                                (practiceMode || currentBid > 0) && handleDragStart(tile)
                            }
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, tile)}
                            style={{
                                left: `${tile.x}vw`,
                                top: `${tile.y}vw`,
                                backgroundImage: `url(${imageUrl})`,
                                backgroundPosition: `-${tile.bgX}vw -${tile.bgY}vw`,
                                backgroundSize: `40vw 24vw`,
                                backgroundRepeat: "no-repeat",
                                opacity: draggedTile?.id === tile.id ? 0.5 : 1,
                                transition: "box-shadow 0.15s ease",
                                boxShadow:
                                    draggedTile?.id === tile.id
                                        ? "0 0 50px rgba(16,185,129,0.8)"
                                        : "0 4px 12px rgba(0,0,0,0.35)",
                            }}
                        />
                    ))}
                </div>

                {/* ---------- CENTER ARROW ---------- */}
                <div className="text-white text-5xl font-bold opacity-80 select-none">
                    ➜
                </div>

                {/* ---------- RIGHT: REFERENCE IMAGE ---------- */}
                <div className="w-[40vw] h-[24vw] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    <img
                        src={imageUrl}
                        alt="Reference"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* ---------- MODALS ---------- */}
            {/* PRACTICE MODAL */}
            <PracticeModal
                show={showPracticeModal}
                type={practiceType}
                moves={moveCount}
                time={finalPracticeTime}
                onClose={() => setShowPracticeModal(false)}
                onConfirm={() => {
                    setShowPracticeModal(false);

                    if (practiceType === "start") {
                        setGameActive(true);
                    } else {
                        setPracticeMode(false);
                        handleRestart();
                    }
                }}
            />

            <Modal
                show={showGameActiveWarning}
                title="Game Active"
                message="Your game is currently active. Finish it before starting practice mode."
                onClose={() => setShowGameActiveWarning(false)}
                singleButton={true}
            />

            {/* BID CONFIRMED MODAL */}
            <Modal
                show={showStartModal}
                title="BID LOCKED"
                variant="start"
                hideCloseButton={true}
                confirmText="START GAME"
                onConfirm={() => {
                    setShowStartModal(false);
                    setGameActive(true);
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

            {/* VICTORY MODAL */}
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
                        {Number((currentBid * rewardMultiplier).toFixed(6)).toString()}
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

            {/* GAME OVER MODAL */}
            <Modal
                title="Game Over"
                message="Out of moves or time!"
                show={isGameOver}
                onClose={handleRestart}
                singleButton={true}
            />
        </>
    );
}