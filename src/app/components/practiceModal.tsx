"use client";

import Modal from "./modal";

interface PracticeModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    type: "start" | "win" | "gameover";
    time?: number;
}

export default function PracticeModal({
    show,
    onClose,
    onConfirm,
    type,
    time,
}: PracticeModalProps) {
    const config = {
        start: {
            title: "Practice Mode",
            confirmText: "Start Practice",
            content: (
                <div className="confirm-details">
                    <div className="confirm-row">
                        <span>No rewards</span>
                        <span className="value">No risk</span>
                    </div>

                    <div className="confirm-row">
                        <span>Retries</span>
                        <span className="value">Unlimited</span>
                    </div>

                    <div className="confirm-row highlight">
                        <span>Mode</span>
                        <span className="reward">Practice</span>
                    </div>
                </div>
            ),
        },

        win: {
            title: "Practice Complete",
            confirmText: "Continue",
            content: (
                <div className="confirm-details">
                    <div className="confirm-row highlight">
                        <span>Time</span>
                        <span className="reward">{time}s</span>
                    </div>
                </div>
            ),
        },

        gameover: {
            title: "Practice Ended",
            confirmText: "Try Again",
            content: (
                <div className="confirm-details">
                    <div className="confirm-row">
                        <span>Result</span>
                        <span className="value">Out of time</span>
                    </div>

                    <div className="confirm-row highlight">
                        <span>Status</span>
                        <span className="reward">Practice</span>
                    </div>
                </div>
            ),
        },
    }[type];

    return (
        <Modal show={show} title={config.title} onClose={onClose}>
            {config.content}

            {onConfirm && (
                <div className="confirm-actions">
                    <button
                        className="btn confirm"
                        onClick={onConfirm}
                    >
                        {config.confirmText}
                    </button>
                </div>
            )}
        </Modal>
    );
}