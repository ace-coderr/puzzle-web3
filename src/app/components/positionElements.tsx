"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

/* ---------------------- GRID CONFIG PER DIFFICULTY ---------------------- */
const GRID_CONFIG = {
    easy: { cols: 6, rows: 4 },
    medium: { cols: 8, rows: 4 },
    hard: { cols: 10, rows: 4 },
} as const;

/* -------------------------------------------------------------
   MAIN COMPONENT
   ------------------------------------------------------------- */
export function PositionElements() {
    const { publicKey } = useWallet();
    const router = useRouter();

    const {
        playWin,
        playLose,
        playPerfect,
        playDanger,
        playEnding,
        stopEnding,
        stopAll,
        unlockAudio,
        playClick,
    } = useGameSounds();

    // CORE STATES
    const [imageUrl, setImageUrl] = useState<string>("/images/preview.jpg");
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [draggedTile, setDraggedTile] = useState<Tile | null>(null);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isWin, setIsWin] = useState<boolean>(false);
    const [time, setTime] = useState<number>(0);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showGameActiveWarning, setShowGameActiveWarning] = useState(false);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [gameActive, setGameActive] = useState(false);
    const [finalTime, setFinalTime] = useState<number>(0);
    const [showWrongMove, setShowWrongMove] = useState(false);
    const [availableSeeds, setAvailableSeeds] = useState<number[]>([]);

    // Practice Mode
    const [practiceMode, setPracticeMode] = useState<boolean>(false);
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [practiceType, setPracticeType] =
        useState<"start" | "win" | "gameover">("start");
    const [finalPracticeTime, setFinalPracticeTime] = useState<number>(0);

    useEffect(() => {
        const seeds = Array.from({ length: 500 }, (_, i) => i + 1);
        setAvailableSeeds(shuffleArray(seeds));
    }, []);

    useEffect(() => {
        const unlock = () => unlockAudio();
        window.addEventListener("pointerdown", unlock, { once: true });
        return () => window.removeEventListener("pointerdown", unlock);
    }, [unlockAudio]);

    /* ---------- Difficulty ---------- */
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [maxTime, setMaxTime] = useState(90);
    const [rewardMultiplier, setRewardMultiplier] = useState(1.5);
    const difficulties = [
        { level: "easy", time: 180 },
        { level: "medium", time: 90 },
        { level: "hard", time: 60 },
    ];

    // 
    useEffect(() => {
        if (practiceMode) {
            setMaxTime(180);
            setRewardMultiplier(1.2);
            return;
        }

        const d = difficulties.find((d) => d.level === difficulty)!;

        setMaxTime(d.time);
        setRewardMultiplier(
            d.level === "easy" ? 1.1 : d.level === "medium" ? 1.5 : 3.0
        );
    }, [difficulty, practiceMode]);

    /* ---------- PREVIEW TILE INIT ---------- */
    useEffect(() => {
        if (!gameActive && !practiceMode) {
            setTiles(generateTiles());
        }
    }, [difficulty, gameActive, practiceMode]);

    /* --------------- Tile generation ----------------- */
    function generateTiles(): Tile[] {
        const { cols, rows } = GRID_CONFIG[difficulty];

        const tileW = 40 / cols;
        const tileH = 24 / rows;

        const positions: [number, number][] = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                positions.push([col * tileW, row * tileH]);
            }
        }

        const shuffled = shuffleArray(positions);

        return positions.map(([bgX, bgY], i) => {
            const [x, y] = shuffled[i];
            return {
                id: i,
                x,
                y,
                bgX,
                bgY,
            };
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
        setAvailableSeeds((prev) => {
            const nextSeeds = [...prev];
            nextSeeds.splice(seedIndex, 1);
            return nextSeeds;
        });

        const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
        const url = source(seed);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            setImageUrl(url);
            setTiles(generateTiles());
            if (showModal) setShowStartModal(true);
        };
    };

    /* ---------- CHECK WIN/LOSE CONDITIONS ---------- */
    useEffect(() => {
        if (!tiles.length) return;

        const won = tiles.every((t) => t.x === t.bgX && t.y === t.bgY);

        if (practiceMode) {
            if (won) {
                setGameActive(false);
                setFinalPracticeTime(time);
                setPracticeType("win");
                setShowPracticeModal(true);
                playWin();
            } else if (time >= maxTime) {
                setGameActive(false);
                setFinalPracticeTime(time);
                setPracticeType("gameover");
                setShowPracticeModal(true);
                playLose();
            }
        } else {
            if (won) {
                setGameActive(false);
                setFinalTime(time);
                setIsWin(true);
                stopEnding();
                playWin();

                saveResult("WIN", {
                    walletAddress: publicKey?.toString(),
                    moves: 0,
                    time,
                    bidding: currentBid,
                    difficulty,
                });
            } else if (time >= maxTime) {
                setIsGameOver(true);
                setGameActive(false);
                stopEnding();
                playLose();

                saveResult("LOSE", {
                    walletAddress: publicKey?.toString(),
                    moves: 0,
                    time,
                    bidding: currentBid,
                    difficulty,
                });
            }
        }
    }, [tiles, time, practiceMode, publicKey, currentBid, difficulty]);

    /* ---------- Timer ---------- */
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (!gameActive) return;
        const interval = setInterval(() => {
            setTime((t) => {
                const next = t + 1;
                if (next === maxTime - 5) playEnding();
                if (next >= maxTime) {
                    stopEnding();
                    clearInterval(interval);
                    return maxTime;
                }
                return next;
            });
        }, 1000);
        timerIntervalRef.current = interval;
        return () => clearInterval(interval);
    }, [gameActive, maxTime, playEnding, stopEnding]);

    /* ---------------------- DRAG & DROP HANDLERS ---------------------- */
    const handleDragStart = (tile: Tile) => {
        if (!gameActive) return;
        setDraggedTile(tile);
        // Play drag start sound
        playClick();
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, target: Tile) => {
        e.preventDefault();
        if (!gameActive || !draggedTile) return;

        const isCorrectDrop = draggedTile.bgX === target.x && draggedTile.bgY === target.y;
        setTiles((tiles) =>
            tiles.map((t) =>
                t.id === draggedTile.id
                    ? { ...t, x: target.x, y: target.y }
                    : t.id === target.id
                        ? { ...t, x: draggedTile.x, y: draggedTile.y }
                        : t
            )
        );
        if (isCorrectDrop) {
            playPerfect();
        } else {
            playDanger();
            setShowWrongMove(true);
            setTimeout(() => setShowWrongMove(false), 900);
        }
        setDraggedTile(null);
    };

    /* ---------------------- RESTART ---------------------- */
    const handleRestart = () => {
        stopAll();
        setCurrentBid(0);
        setShowStartModal(false);
        setPracticeMode(false);
        setImageUrl("/images/preview.jpg");
        setTiles(generateTiles());
        setTime(0);
        setFinalTime(0);
        setIsWin(false);
        setIsGameOver(false);
        setGameActive(false);
    };

    /* ---------- Event Handler for Bid ---------- */
    const handlePuzzleRestart = useCallback(
        (e: any) => {
            const { amount, gameId, practice, difficulty: incomingDifficulty } = e?.detail || {};
            if (gameId) localStorage.setItem("currentGameId", gameId);
            setPracticeMode(!!practice);
            setCurrentBid(amount || 0);
            setGameActive(false);
            if (
                incomingDifficulty &&
                (incomingDifficulty === "easy" ||
                    incomingDifficulty === "medium" ||
                    incomingDifficulty === "hard")
            ) {
                setDifficulty(incomingDifficulty);
            }
            if (amount > 0 || practice) {
                loadPuzzleImage(true);
            } else {
                setImageUrl("/images/preview.jpg");
                setTiles(generateTiles());
            }
            setTime(0);
        },
        [loadPuzzleImage]
    );

    // Listen for puzzle-restart event
    useEffect(() => {
        document.addEventListener("puzzle-restart", handlePuzzleRestart);
        return () => document.removeEventListener("puzzle-restart", handlePuzzleRestart);
    }, [handlePuzzleRestart]);

    // Listen for difficulty changes
    useEffect(() => {
        const onDifficultyChange = (e: any) => {
            const newDiff = e?.detail;
            if (
                newDiff &&
                (newDiff === "easy" || newDiff === "medium" || newDiff === "hard")
            ) {
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
            <div>
                <button
                    onClick={() => {
                        if (gameActive) {
                            setShowGameActiveWarning(true);
                            return;
                        }
                        setPracticeMode(true);
                        setDifficulty("easy");
                        setMaxTime(180);
                        setPracticeType("start");
                        setShowPracticeModal(true);
                        loadPuzzleImage(false);
                        setTime(0);
                        setIsWin(false);
                        setIsGameOver(false);
                        setGameActive(false);
                        playClick();
                    }}
                    className="practice-mode1"
                >
                    Practice Mode
                </button>
            </div>

            {/* ----- Counters ----- */}
            {gameActive && (
                <div className="flex justify-center gap-10 mt-6 text-xl font-semibold text-white time-count">
                    <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow">
                        Time: {time}s / {maxTime}s
                    </p>
                </div>
            )}

            {/* ----- Puzzle board ----- */}
            <div className="flex justify-center items-center gap-10 mt-12 w-full puzzle-board">
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent shadow-[0_0_60px_rgba(0,0,0,0.6)]">
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none" />
                    <div className="relative w-[40vw] h-[24vw] rounded-xl overflow-hidden bg-black/40 border border-white/10">
                        {(() => {
                            const { cols, rows } = GRID_CONFIG[difficulty];
                            const tileW = 40 / cols;
                            const tileH = 24 / rows;

                            /* ---------- PREVIEW MODE ---------- */
                            if (!gameActive && !practiceMode) {
                                return tiles.map((tile) => (
                                    <div
                                        key={tile.id}
                                        className="absolute box-border opacity-80"
                                        style={{
                                            width: `${tileW}vw`,
                                            height: `${tileH}vw`,
                                            left: `${tile.x}vw`,
                                            top: `${tile.y}vw`,
                                            backgroundImage: 'url("/images/preview.jpg")',
                                            backgroundPosition: `-${tile.bgX}vw -${tile.bgY}vw`,
                                            backgroundSize: `40vw 24vw`,
                                            backgroundRepeat: "no-repeat",
                                        }}
                                    />
                                ));
                            }

                            /* ---------- ACTIVE GAME / PRACTICE ---------- */
                            return tiles.map((tile) => (
                                <div
                                    key={tile.id}
                                    className="absolute box-border tile-element puzzle-tile"
                                    draggable={practiceMode || currentBid > 0}
                                    onDragStart={() => handleDragStart(tile)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, tile)}
                                    onClick={(e) => {
                                        // Prevent the global click handler from firing on tile clicks
                                        e.stopPropagation();
                                    }}
                                    style={{
                                        width: `${tileW}vw`,
                                        height: `${tileH}vw`,
                                        left: `${tile.x}vw`,
                                        top: `${tile.y}vw`,
                                        backgroundImage: `url(${imageUrl})`,
                                        backgroundPosition: `-${tile.bgX}vw -${tile.bgY}vw`,
                                        backgroundSize: `40vw 24vw`,
                                        backgroundRepeat: "no-repeat",
                                        opacity: draggedTile?.id === tile.id ? 0.5 : 1,
                                        cursor: "grab",
                                        transition: "box-shadow 0.15s ease",
                                        boxShadow:
                                            draggedTile?.id === tile.id
                                                ? "0 0 50px rgba(16,185,129,0.8)"
                                                : "0 4px 12px rgba(0,0,0,0.35)",
                                    }}
                                />
                            ));
                        })()}
                    </div>

                    {/* WRONG MOVE INDICATOR */}
                    {showWrongMove && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                            <span className="text-red-400 text-6xl font-black animate-float-fade drop-shadow-[0_0_20px_rgba(248,113,113,0.8)]">
                                -1
                            </span>
                        </div>
                    )}
                </div>

                {/* ================== CENTER ARROW ================== */}
                <div className="text-white text-5xl font-bold opacity-80 select-none">➜</div>

                {/* ================== REFERENCE IMAGE ================== */}
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent shadow-[0_0_60px_rgba(0,0,0,0.6)]">
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none" />
                    <div className="w-[40vw] h-[24vw] rounded-xl overflow-hidden border border-white/10">
                        <img
                            src={imageUrl}
                            alt="Reference"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* ---------- MODALS ---------- */}

            {/* PRACTICE MODAL (already correct) */}
            <PracticeModal
                show={showPracticeModal}
                type={practiceType}
                time={finalPracticeTime}
                onClose={() => {
                    setShowPracticeModal(false);
                    playClick();
                }}
                onConfirm={() => {
                    setShowPracticeModal(false);
                    playClick();
                    if (practiceType === "start") {
                        setGameActive(true);
                    } else {
                        setPracticeMode(false);
                        handleRestart();
                    }
                }}
            />

            {/* GAME ACTIVE WARNING */}
            <Modal
                show={showGameActiveWarning}
                title="Game Active"
                onClose={() => {
                    setShowGameActiveWarning(false);
                    playClick();
                }}
            >
                <div className="confirm-details">
                    <div className="confirm-row">
                        <span>
                            Your game is currently active. Finish it before starting practice mode.
                        </span>
                    </div>
                </div>

                <div className="confirm-actions">
                    <button
                        className="btn confirm"
                        onClick={() => {
                            setShowGameActiveWarning(false);
                            playClick();
                        }}
                    >
                        OK
                    </button>
                </div>
            </Modal>

            {/* BID CONFIRMED / START GAME */}
            <Modal
                show={showStartModal}
                title="Bid Locked"
                onClose={() => {
                    setShowStartModal(false);
                    playClick();
                }}
            >
                <div className="confirm-details">
                    <div className="confirm-row">
                        <span>Bid Amount</span>
                        <span className="value">{currentBid} SOL</span>
                    </div>

                    <div className="confirm-row">
                        <span>Time Limit</span>
                        <span className="value">{maxTime}s</span>
                    </div>

                    <div className="confirm-row highlight">
                        <span>Reward</span>
                        <span className="reward">{rewardMultiplier}x</span>
                    </div>
                </div>

                <div className="confirm-actions">
                    <button
                        className="btn cancel"
                        onClick={() => {
                            setShowStartModal(false);
                            playClick();
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        className="btn confirm"
                        onClick={() => {
                            setShowStartModal(false);
                            setGameActive(true);
                            playClick();
                        }}
                    >
                        Start Game
                    </button>
                </div>

                <div className="confirm-note">
                    No refunds. Click confirm when ready.
                </div>
            </Modal>

            {/* VICTORY MODAL */}
            <Modal
                show={isWin}
                title="Puzzle Victory"
                onClose={() => {
                    handleRestart();
                    playClick();
                }}
            >
                <div className="confirm-details" style={{ alignItems: "center" }}>
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                        <div
                            style={{
                                fontSize: 72,
                                fontWeight: 900,
                                color: "#3cff8f",
                                lineHeight: 1,
                            }}
                        >
                            {Number((currentBid * rewardMultiplier).toFixed(6)).toString()}
                        </div>

                        <div
                            style={{
                                fontSize: 28,
                                fontWeight: 700,
                                color: "#9cffc0",
                                marginTop: -6,
                            }}
                        >
                            SOL REWARD
                        </div>
                    </div>

                    <div className="confirm-row">
                        <span>Completion Time..</span>
                        <span className="value">{finalTime}s</span>
                    </div>

                    <div className="confirm-row highlight">
                        <span>Status..</span>
                        <span className="reward">Success</span>
                    </div>
                </div>

                <div className="confirm-actions">
                    <button
                        className="btn confirm"
                        onClick={() => {
                            router.push("/reward");
                            playClick();
                        }}
                    >
                        Claim Reward
                    </button>
                </div>

                <div className="confirm-note">
                    Reward processed instantly • No fees • Real wins
                </div>
            </Modal>


            {/* GAME OVER MODAL */}
            <Modal
                show={isGameOver}
                title="Game Over"
                onClose={() => {
                    handleRestart();
                    playClick();
                }}
            >
                <div className="confirm-details">
                    <div className="confirm-row">
                        <span>Out of moves or time!</span>
                    </div>
                </div>

                <div className="confirm-actions">
                    <button
                        className="btn confirm"
                        onClick={() => {
                            handleRestart();
                            playClick();
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </Modal>
        </>
    );
}