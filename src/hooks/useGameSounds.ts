import { useEffect } from "react";

export const useGameSounds = () => {
    const playWin = () => {
        const audio = new Audio("/sounds/win.mp3");
        audio.volume = 0.7;
        audio.play().catch(() => { });
    };

    const playLose = () => {
        const audio = new Audio("/sounds/claim.mp3");
        audio.volume = 0.6;
        audio.play().catch(() => { });
    };

    const playClaim = () => {
        const audio = new Audio("/sounds/claim.mp3");
        audio.volume = 0.8;
        audio.play().catch(() => { });
    };

    return { playWin, playLose, playClaim };
};