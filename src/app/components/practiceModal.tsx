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

export default function PracticeModal({
    show,
    onClose,
    onConfirm,
    type,
    moves,
    time,
}: PracticeModalProps) {
    const variant =
        type === "start" ? "start" : type === "win" ? "success" : "default";

    const config = {
        start: {
            title: "Practice Mode",
            confirmText: "Start Practice",
            content: (
                <div className="space-y-6">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                        <p className="text-sm uppercase tracking-wide text-white/50">
                            Mode Info
                        </p>
                        <p className="text-lg font-semibold text-white mt-2">
                            No rewards • No risk
                        </p>
                        <p className="text-sm text-white/60 mt-3 leading-relaxed">
                            Practice mode lets you sharpen your skills without affecting
                            your real balance or progress.
                        </p>
                    </div>

                    <ul className="text-sm text-white/70 space-y-2 px-2">
                        <li>• Unlimited retries</li>
                        <li>• No SOL involved</li>
                        <li>• Improve speed & accuracy</li>
                    </ul>
                </div>
            ),
        },

        win: {
            title: "Practice Complete",
            confirmText: "Continue",
            content: (
                <div className="text-center space-y-4 py-8">
                    <p className="text-5xl font-extrabold text-emerald-400">
                        Well Done
                    </p>

                    <p className="text-lg text-white/80">
                        Completed in{" "}
                        <span className="text-emerald-300 font-semibold">
                            {moves}
                        </span>{" "}
                        moves •{" "}
                        <span className="text-emerald-300 font-semibold">
                            {time}s
                        </span>
                    </p>

                    <p className="text-sm text-white/60 max-w-sm mx-auto">
                        This was a practice run. Ready to try a real game?
                    </p>
                </div>
            ),
        },

        gameover: {
            title: "Practice Ended",
            confirmText: "Try Again",
            content: (
                <div className="text-center space-y-4 py-8">
                    <p className="text-4xl font-bold text-white">
                        Out of moves or time
                    </p>

                    <p className="text-sm text-white/60 max-w-sm mx-auto">
                        No worries — practice is about learning. Try again and improve
                        your strategy.
                    </p>
                </div>
            ),
        },
    }[type];

    return (
        <Modal
            show={show}
            title={config.title}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmText={config.confirmText}
            variant={variant}
            hideCloseButton
        >
            {config.content}
        </Modal>
    );
}