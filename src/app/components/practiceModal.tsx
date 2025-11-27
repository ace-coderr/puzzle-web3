"use client";

import Modal from "./modal";

interface PracticeModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    type: "start" | "win" | "gameover";
    moves?: number;
    time?: number;
}

export default function PracticeModal({ show, onClose, onConfirm, type, moves, time }: PracticeModalProps) {
    let title = "";
    let confirmText = "OK";
    let content: React.ReactNode = null;

    const variant = type === "start" ? "start" : type === "win" ? "success" : "default";

    if (type === "start") {
        title = "Practice Session";
        confirmText = "Start Practice";
        content = (
            <div className="space-y-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <p className="text-lg font-semibold text-white/80">Practice Reward</p>
                    <p className="text-2xl font-bold text-green-400 mt-2">Practice Reward</p>
                    <p className="text-sm mt-3 text-red-400">
                        No refunds in practice mode.
                    </p>
                </div>

                <p className="text-white/70 text-sm px-2 leading-relaxed">
                    Solve the puzzle as fast as possible. Practice mode does not affect your
                    real game progress or earnings.
                </p>
            </div>
        );

    } else if (type === "win") {
        title = "Practice Victory";
        confirmText = "Celebrate!";
        content = (
            <div className="text-center py-12">
                <p className="text-6xl font-black text-green-400 animate-pulse">🎉</p>
                <p className="text-2xl mt-4 text-white font-semibold">
                    Puzzle completed in {moves} moves - {time}s
                </p>
                <p className="text-lg text-white/70 mt-4">
                    This was a practice run — no rewards at stake.
                </p>
            </div>
        );
    } else if (type === "gameover") {
        title = "Practice Over";
        confirmText = "Try Again";
        content = (
            <div className="text-center py-12">
                <p className="text-6xl font-black text-red-400 animate-pulse">⚠️</p>
                <p className="text-2xl mt-4 text-white font-semibold">
                    Out of moves or time!
                </p>
                <p className="text-lg text-white/70 mt-4">
                    This was a practice run — try again to improve.
                </p>
            </div>
        );
    }

    return (
        <Modal
            show={show}
            title={title}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmText={confirmText}
            variant={variant} // ← sets the color
        >
            {content}
        </Modal>
    );
}
