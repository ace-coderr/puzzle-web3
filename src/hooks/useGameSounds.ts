import { useEffect, useRef } from "react";

type SoundMap = {
    win: HTMLAudioElement;
    lose: HTMLAudioElement;
    claim: HTMLAudioElement;
    perfect: HTMLAudioElement;
    danger: HTMLAudioElement;
    ending: HTMLAudioElement;
};

export const useGameSounds = () => {
    const sounds = useRef<SoundMap | null>(null);

    useEffect(() => {
        sounds.current = {
            win: new Audio("/sounds/win.mp3"),
            lose: new Audio("/sounds/lose.mp3"),
            claim: new Audio("/sounds/claim.mp3"),
            perfect: new Audio("/sounds/perfect.mp3"),
            danger: new Audio("/sounds/danger.mp3"),
            ending: new Audio("/sounds/ending.mp3"),
        };

        // Set volumes
        sounds.current.win.volume = 0.7;
        sounds.current.lose.volume = 0.6;
        sounds.current.claim.volume = 0.8;
        sounds.current.perfect.volume = 0.7;
        sounds.current.danger.volume = 0.6;
        sounds.current.ending.volume = 0.5;
        return () => {
            sounds.current = null;
        };
    }, []);

    const play = (key: keyof SoundMap) => {
        const audio = sounds.current?.[key];
        if (!audio) return;

        audio.currentTime = 0;
        audio.play().catch(() => { });
    };

    return {
        playWin: () => play("win"),
        playLose: () => play("lose"),
        playClaim: () => play("claim"),

        // 🎮 Gameplay
        playPerfect: () => play("perfect"),
        playDanger: () => play("danger"),
        playEnding: () => play("ending"),
    };
};