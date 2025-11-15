"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

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
    opts: { walletAddress?: string; moves: number; time: number; bidding: number; reward?: number }
) {
    if (!opts.walletAddress) {
        console.log("Demo mode: result not recorded.");
        return;
    }

    const gameId = localStorage.getItem("currentGameId");
    if (!gameId) {
        console.error("No gameId in localStorage — cannot save result");
        return;
    }

    try {
        const res = await fetch("/api/game-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                walletAddress: opts.walletAddress,
                moves: opts.moves,
                score: opts.time,
                bidding: opts.bidding,
                won: result === "WIN",
                gameId,
            }),
        });

        const text = await res.text();
        console.log("Raw /api/game-results response:", text);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${text || "Unknown error"}`);
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.warn("Response not JSON, but OK:", text);
            return;
        }

        console.log("Game result saved:", data);
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
   MAIN COMPONENT
   ------------------------------------------------------------- */
export function PositionElements({ onRetry }: { onRetry?: () => void }) {
    const { publicKey, connected } = useWallet();
    const router = useRouter();

    /* ---------- State ---------- */
    const [imageUrl, setImageUrl] = useState<string>("/images/wall.jpg")
    const [tiles, setTiles] = useState<Tile[]>([])
    const [draggedTile, setDraggedTile] = useState<Tile | null>(null)
    const [hoveredTile, setHoveredTile] = useState<Tile | null>(null)
    const [moveCount, setMoveCount] = useState<number>(0)
    const [isGameOver, setIsGameOver] = useState<boolean>(false)
    const [isWin, setIsWin] = useState<boolean>(false)
    const [time, setTime] = useState<number>(0)
    const [timerActive, setTimerActive] = useState<boolean>(false)
    const [showStartPage, setShowStartPage] = useState(true)
    const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
    const [resultSaved, setResultSaved] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [currentBid, setCurrentBid] = useState<number>(0);
    const [showStartModal, setShowStartModal] = useState(false);
    const [bidStarted, setBidStarted] = useState(false);

    /* ---------- Difficulty ---------- */
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [maxMoves, setMaxMoves] = useState(30);
    const [maxTime, setMaxTime] = useState(90);

    const difficulties = [
        { level: 'easy' as const, moves: 40, time: 180 },
        { level: 'medium' as const, moves: 30, time: 90 },
        { level: 'hard' as const, moves: 20, time: 60 },
    ] as const;

    useEffect(() => {
        const d = difficulties.find(d => d.level === difficulty)!;
        setMaxMoves(d.moves);
        setMaxTime(d.time);
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
        if (tiles.length === 0 || resultSaved) return;
        const hasWon = tiles.every((tile) => tile.x === tile.bgX && tile.y === tile.bgY);

        const handleResult = async () => {
            if (hasWon) {
                setIsWin(true);
                setTimerActive(false);
                setResultSaved(true);
                await saveResult("WIN", {
                    walletAddress: publicKey?.toString(),
                    moves: moveCount,
                    time,
                    bidding: currentBid,
                    reward: currentBid * 2,
                });
                setBidStarted(false);
            } else if (moveCount >= maxMoves || time >= maxTime) {
                setIsGameOver(true);
                setTimerActive(false);
                setResultSaved(true);
                await saveResult("LOSE", {
                    walletAddress: publicKey?.toString(),
                    moves: moveCount,
                    time,
                    bidding: currentBid,
                });
                setBidStarted(false);
            }
        };

        handleResult();
    }, [tiles, moveCount, time, publicKey, resultSaved, maxMoves, maxTime, currentBid]);


    /* ---------- Timer ---------- */
    useEffect(() => {
        if (!timerActive) return;

        const interval = setInterval(() => {
            setTime((t) => {
                if (t >= maxTime) {
                    clearInterval(interval);
                    setTimerActive(false);
                    setIsGameOver(true);
                }
                return t + 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timerActive, maxTime]);


    /* ---------- Image helpers ---------- */
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setImageUrl(url)
        }
    };
    const handleRandomImage = () => {
        const seed = Math.floor(Math.random() * 1000)
        const url = `https://picsum.photos/seed/${seed}/800/480`
        setImageUrl(url)
    };

    /* ---------- Tile Drag/Drop ---------- */
    const handleDragStart = (tile: Tile) => setDraggedTile(tile);
    const handleDragOver = (e: React.DragEvent, tile: Tile) => {
        e.preventDefault();
        if (draggedTile && draggedTile.id !== tile.id) {
            setHoveredTile(tile)
        }
    };

    const handleDrop = (e: React.DragEvent, targetTile: Tile) => {
        e.preventDefault();
        if (!draggedTile || resultSaved) return;

        const updatedTiles = tiles?.map((tile) => {
            if (tile.id === draggedTile.id) {
                return { ...tile, x: targetTile.x, y: targetTile.y };
            } else if (tile.id === targetTile.id) {
                return { ...tile, x: draggedTile.x, y: draggedTile.y }
            }
            return tile;
        });
        setTiles(updatedTiles);
        setDraggedTile(null);
        setHoveredTile(null);

        if (moveCount === 0) {
            setTimerActive(true);
        }
        setMoveCount((prev) => prev + 1);
    };

    const handleDragEnd = () => {
        setDraggedTile(null)
        setHoveredTile(null)
    }


    /* ---------- Restart / Reset ---------- */
    const handleRestart = (newImage?: string, startTimer = true) => {
        const finalImage = newImage || "/images/wall.jpg";
        setImageUrl(finalImage);
        const newTiles = generateTiles(finalImage);
        setTiles(newTiles);
        setMoveCount(0);
        setIsGameOver(false);
        setIsWin(false);
        setTime(0);
        setTimerActive(startTimer);
        setResultSaved(false);
        setShowStartModal(false);
    };
    const handleResetToDefault = () => {
        handleRestart("/images/wall.jpg");
        setBidStarted(false);
    };
    const handleStartGame = () => {
        setShowStartModal(false);
        setTimerActive(true);
        setTime(0);
    };


    /* ---------- Bid-success listener ---------- */
    useEffect(() => {
        const handleBidRestart = (e: any) => {
            const { walletAddress, amount, gameId } = e.detail || {};
            if (gameId) {
                localStorage.setItem("currentGameId", gameId);
                console.log("Stored currentGameId:", gameId);
            }
            setWalletAddress(walletAddress);
            setCurrentBid(amount || 0);
            const randomSeed = Math.floor(Math.random() * 1000000);
            const randomImageUrl = `https://picsum.photos/seed/${randomSeed}/800/480`;
            handleRestart(randomImageUrl, false);
            setTimerActive(false);
            setTime(0);
            setBidStarted(true);
            setShowStartModal(true);
        };
        document.addEventListener("puzzle-restart", handleBidRestart);
        return () => document.removeEventListener("puzzle-restart", handleBidRestart);
    }, []);



    /* -------------------------------------------------------------
     RENDER
     ------------------------------------------------------------- */
    return (
        <>
            {/* ----- Welcome screen ----- */}
            {showStartPage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
                    <div className="bg-white start1 bg-opacity-80 p-8 rounded shadow-lg text-center max-w-sm">
                        <h1 className="text-2xl font-bold mb-4">Puzzle Challenge</h1>
                        <p className="text-lg mb-6">Align all tiles within 20 moves or 60 seconds.</p>
                        <button
                            onClick={() => setShowStartPage(false)}
                            className="px-6 py-2 bg-gray-900 over-btn text-white rounded hover:bg-gray-400 transition"
                        >
                            Start Game
                        </button>
                    </div>
                </div>
            )}


            {/* ----- Difficulty picker (only when wallet connected) ----- */}
            {connected && (
                <div className="flex justify-center gap-3 mt-4 mb-2">
                    {difficulties.map(d => (
                        <button
                            key={d.level}
                            onClick={() => setDifficulty(d.level)}
                            className={`px-4 py-1 rounded-lg text-sm font-medium transition ${difficulty === d.level
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {d.level.toUpperCase()}
                        </button>
                    ))}
                </div>
            )}


            {/* ----- Counters ----- */}
            <div className="flex justify-center gap-10 mt-4 text-xl font-semibold text-white time-count">
                <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow">Moves: {moveCount} / {maxMoves}</p>
                <p className="bg-gray-900/80 px-4 py-2 rounded-lg shadow">Time: {time}s / {maxTime}s</p>
            </div>

            {/* ----- Puzzle board ----- */}
            {/* {imageUrl && ( */}
            <div className="relative w-[40vw] h-[24vw] overflow-hidden stylle">
                {tiles.map((tile) => (
                    <div
                        key={tile.id}
                        className="absolute w-[8vw] h-[6vw] box-border"
                        draggable
                        onDragStart={() => handleDragStart(tile)}
                        onDragOver={(e) => handleDragOver(e, tile)}
                        onDrop={(e) => handleDrop(e, tile)}
                        onDragEnd={handleDragEnd}
                        style={{
                            left: `${tile.x}vw`,
                            top: `${tile.y}vw`,
                            backgroundImage: `url(${imageUrl})`,
                            backgroundPosition: `-${tile.bgX}vw -${tile.bgY}vw`,
                            backgroundSize: `40vw 24vw`,
                            backgroundRepeat: 'no-repeat',
                            border: hoveredTile?.id === tile.id ? '2px dashed red' : 'none',
                            opacity: draggedTile?.id === tile.id ? 0.5 : 1
                        }}
                    />
                ))}
            </div>
            {/* )} */}


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

                {/* ---------- MODALS (single reusable component) ---------- */}

                {/* Bid-confirmation → Start */}
                <Modal
                    title="Bid Confirmed!"
                    message={`Your ${currentBid} SOL bid is locked.\nReady to play?`}
                    show={showStartModal}
                    onConfirm={handleStartGame}
                    confirmText="Start Game"
                    variant="start" onClose={function (): void {
                        throw new Error("Function not implemented.");
                    }} />

                {/* Victory */}
                <Modal
                    title="Puzzle Victory"
                    message={`Won in ${moveCount} moves, ${time}s`}
                    show={isWin}
                    onClose={() => { setIsWin(false); handleResetToDefault(); }}
                    onConfirm={() => router.push("/reward")}
                    confirmText="Claim Reward"
                    variant="success"
                >
                    <p className="text-2xl font-bold text-green-400">{currentBid * 2} SOL</p>
                </Modal>

                {/* Game Over */}
                <Modal
                    title="Game Over"
                    message="Out of moves or time!"
                    show={isGameOver}
                    onClose={() => { setIsGameOver(false); handleResetToDefault(); }}
                    singleButton={true}
                />
            </div>
        </>
    );
}