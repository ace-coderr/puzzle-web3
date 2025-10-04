"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

export type Tile = {
    id: number;
    x: number;
    y: number;
    bgX: number;
    bgY: number;
};

async function saveResult(result: "WIN" | "LOSE",
    opts: { walletAddress?: string, moves: number, time: number, bidding: number }
) {
    if (!opts.walletAddress) {
        console.log("🕹️ Demo mode: result not recorded.");
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
            }),
        });

        if (!res.ok) {
            const error = await res.json();
            console.error("❌ Failed to save result:", error);
        } else {
            const data = await res.json();
            console.log("✅ Game result saved:", data);
        }
    } catch (err) {
        console.error("❌ Error saving result:", err);
    }
}

// shuffle helper
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function PositionElements({ onRestart }: { onRestart?: () => void }) {
    const [imageUrl, setImageUrl] = useState<string>('./images/wall.jpg')
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

    useEffect(() => {
        if (tiles.length === 0 || resultSaved) return;

        const hasWon = tiles.every((tile) => tile.x === tile.bgX && tile.y === tile.bgY);

        if (hasWon) {
            setIsWin(true);
            setTimerActive(false);

            saveResult("WIN", {
                walletAddress,
                moves: moveCount,
                time,
                bidding: 50,
            });

            setResultSaved(true);

        } else if (moveCount >= 20 || time >= 60) {
            setIsGameOver(true);
            setTimerActive(false);

            saveResult("LOSE", {
                walletAddress,
                moves: moveCount,
                time,
                bidding: 50,
            });

            setResultSaved(true);

        }
    }, [tiles, moveCount, time, walletAddress, resultSaved]);

    useEffect(() => {
        if (!timerActive) return;

        const interval = setInterval(() => {
            setTime((t) => {
                if (t >= 59) {
                    clearInterval(interval);
                    setTimerActive(false);
                }
                return t + 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timerActive])

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
    }


    // --- TILE DRAG/DROP ---
    const handleDragStart = (tile: Tile) => setDraggedTile(tile);

    const handleDragOver = (e: React.DragEvent, tile: Tile) => {
        e.preventDefault();
        if (draggedTile && draggedTile.id !== tile.id) {
            setHoveredTile(tile)
        }
    };

    const handleDrop = (e: React.DragEvent, targetTile: Tile) => {
        e.preventDefault();
        if (!draggedTile) return;

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

        setMoveCount((prev) => prev + 1)
    };

    const handleDragEnd = () => {
        setDraggedTile(null)
        setHoveredTile(null)
    }

    // --- RESTART ---
    const handleRestart = (newImage?: string) => {
        const finalImage = newImage || "./images/wall.jpg"; // ✅ fallback to default
        setImageUrl(finalImage);
        const newTiles = generateTiles(finalImage);
        setTiles(newTiles);
        setMoveCount(0);
        setIsGameOver(false);
        setIsWin(false);
        setTime(0);
        setTimerActive(false);
    };

    // Initial puzzle
    useEffect(() => {
        handleRestart("./images/wall.jpg");
    }, []);

    // After bid success → listen for custom event
    useEffect(() => {
        const listener = () => {
            const newImage = `https://picsum.photos/seed/${Date.now()}/800/480`; // 🎯 fetch new image
            handleRestart(newImage);
        };
        document.addEventListener("puzzle-restart", listener);
        return () => document.removeEventListener("puzzle-restart", listener);
    }, []);

    // RENDER
    return (
        <>

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


            {imageUrl && (
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
            )}

            <div className="flex flex-col items-center gap-4 p-4">
                <div>
                    <br />
                    <img
                        src={imageUrl}
                        alt="Original"
                        className="w-[20vw] h-auto border rounded shadow"
                    />
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleRandomImage}
                        className=" bg-gray-900 hover:bg-gray-400 transition random-btn"
                    >
                        Random Image
                    </button>

                    <button onClick={() => inputRef.current?.click()}
                        className="bg-gray-900 hover:bg-gray-400 transition random-btn"
                    >
                        Upload Image
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                    />
                </div>


                <div className="mt-4 text-center">
                    <p className="text-xl">Moves: {moveCount} / 20</p>
                    <p className="text-xl">Time: {time}s</p>
                </div>

                <Modal
                    title="🎉 You Win!"
                    message={`You solved it in ${moveCount} moves and ${time}s.`}
                    show={isWin}
                    onClose={() => {
                        setIsWin(false);
                        handleRestart();
                    }}
                    onConfirm={handleRestart}
                    confirmText="Play Again"
                />

                <Modal
                    title="💀 Game Over 💀"
                    message={`You took too long or used too many moves.\nMoves: ${moveCount}, Time: ${time}s`}
                    show={isGameOver}
                    onClose={() => {
                        setIsGameOver(false);
                        handleRestart();
                    }}
                    onConfirm={handleRestart}
                    confirmText="Retry"
                />
            </div>
        </>
    );
}

