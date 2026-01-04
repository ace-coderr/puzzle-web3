"use client";
import { useRef } from "react";

let audioUnlocked = false;
let muted = false;

const effects: HTMLAudioElement[] = [];

export const useGameSounds = () => {
    const bgRef = useRef<HTMLAudioElement | null>(null);
    const endingRef = useRef<HTMLAudioElement | null>(null);

    // UNLOCK AUDIO CONTEXT
    const unlockAudio = () => {
        if (audioUnlocked) return;

        const silent = new Audio(
            "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
        );

        silent.play().catch(() => { });
        audioUnlocked = true;
    };

    // PREPARE BACKGROUND AUDIO
    const prepareBg = () => {
        if (bgRef.current) return;

        const audio = new Audio("/sounds/background.mp3");
        audio.loop = true;
        audio.volume = 0.35;
        audio.muted = true;
        bgRef.current = audio;
    };

    // PLAY / STOP BACKGROUND AUDIO
    const playBg = () => {
        if (!audioUnlocked || muted) return;

        prepareBg();

        const bg = bgRef.current!;
        bg.muted = false;

        bg.play().catch(() => { });
    };

    const stopBg = () => {
        if (!bgRef.current) return;
        bgRef.current.pause();
        bgRef.current.currentTime = 0;
    };

    // PLAY / STOP ENDING AUDIO
    const playEnding = () => {
        if (!audioUnlocked || muted) return;

        endingRef.current?.pause();

        const audio = new Audio("/sounds/ending.mp3");
        audio.loop = true;
        audio.volume = 0.6;
        audio.muted = muted;

        audio.play().catch(() => { });
        endingRef.current = audio;
    };

    const stopEnding = () => {
        if (!endingRef.current) return;
        endingRef.current.pause();
        endingRef.current.currentTime = 0;
        endingRef.current = null;
    };

    // PLAY ONE-SHOT EFFECTS
    const playEffect = (src: string, volume = 0.7, rate = 1.0) => {
        if (!audioUnlocked || muted) return;

        const audio = new Audio(src);
        audio.volume = volume;
        audio.muted = muted;
        audio.playbackRate = rate;
        effects.push(audio);

        audio.play().catch(() => { });

        audio.addEventListener("ended", () => {
            const i = effects.indexOf(audio);
            if (i !== -1) effects.splice(i, 1);
        });
    };

    /* GLOBAL MUTE */
    const setMuted = (state: boolean) => {
        muted = state;

        if (bgRef.current) bgRef.current.muted = state;
        if (endingRef.current) endingRef.current.muted = state;
        effects.forEach(a => (a.muted = state));
    };

    /* STOP EVERYTHING */
    const stopAll = () => {
        effects.forEach(a => {
            a.pause();
            a.currentTime = 0;
        });

        stopBg();
        stopEnding();
    };

    return {
        unlockAudio,
        prepareBg,
        playBg,
        stopBg,
        playEnding,
        stopEnding,
        setMuted,
        stopAll,
        playWin: () => playEffect("/sounds/win.mp3"),
        playLose: () => playEffect("/sounds/lose.mp3"),
        playPerfect: () => playEffect("/sounds/perfect.mp3"),
        playDanger: () => playEffect("/sounds/tick.mp3", 0.5),
        playClick: () => playEffect("/sounds/tick.mp3", 0.3, 1.5),
        playClaim: () => playEffect("/sounds/claim.mp3", 0.8),
    };
};