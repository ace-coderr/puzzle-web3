"use client";

import { useRef } from "react";

let audioUnlocked = false;
let muted = false;

const audios: HTMLAudioElement[] = [];

export const useGameSounds = () => {
    const bgRef = useRef<HTMLAudioElement | null>(null);
    const endingRef = useRef<HTMLAudioElement | null>(null);

    /* 🔓 UNLOCK AUDIO (MOBILE FIX) */
    const unlockAudio = () => {
        if (audioUnlocked) return;

        const silent = new Audio();
        silent.play().catch(() => { });
        audioUnlocked = true;
    };

    /* 🔇 GLOBAL MUTE */
    const setMuted = (state: boolean) => {
        muted = state;
        audios.forEach((a) => (a.muted = state));
        if (bgRef.current) bgRef.current.muted = state;
        if (endingRef.current) endingRef.current.muted = state;
    };

    /* 🛑 STOP EVERYTHING */
    const stopAll = () => {
        audios.forEach((a) => {
            a.pause();
            a.currentTime = 0;
        });
    };

    /* 🎵 BACKGROUND */
    const playBg = () => {
        if (bgRef.current || muted) return;

        const audio = new Audio("/sounds/bg.mp3");
        audio.loop = true;
        audio.volume = 0.35;
        audio.muted = muted;
        audio.play().catch(() => { });
        bgRef.current = audio;
    };

    const stopBg = () => {
        bgRef.current?.pause();
        bgRef.current = null;
    };

    /* 🏁 ENDING */
    const playEnding = () => {
        if (muted) return;

        endingRef.current?.pause();
        const audio = new Audio("/sounds/ending.mp3");
        audio.volume = 0.6;
        audio.muted = muted;
        audio.play().catch(() => { });
        endingRef.current = audio;
    };

    const stopEnding = () => endingRef.current?.pause();

    /* 🔊 EFFECT HELPER */
    const playEffect = (src: string, volume = 0.7) => {
        if (muted) return;
        const audio = new Audio(src);
        audio.volume = volume;
        audio.muted = muted;
        audios.push(audio);
        audio.play().catch(() => { });
    };

    return {
        unlockAudio,
        setMuted,
        stopAll,
        playBg,
        stopBg,
        playEnding,
        stopEnding,
        playWin: () => playEffect("/sounds/win.mp3"),
        playLose: () => playEffect("/sounds/lose.mp3"),
        playPerfect: () => playEffect("/sounds/perfect.mp3"),
        playDanger: () => playEffect("/sounds/tick.mp3", 0.5),
    };
};