"use client";

import { useEffect, useRef, useState } from "react";

// Game sound hook for managing audio playback
export const useGameSounds = () => {
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const endingPlayedRef = useRef(false);

  /* ---------- AUDIO INSTANCES ---------- */
  const sounds = useRef({
    win: new Audio("/sounds/win.mp3"),
    lose: new Audio("/sounds/lose.mp3"),
    perfect: new Audio("/sounds/perfect.mp3"),
    danger: new Audio("/sounds/danger.mp3"),
    ending: new Audio("/sounds/ending.mp3"),
    bg: new Audio("/sounds/background.mp3"),
  });

  /* ---------- INITIAL SETUP ---------- */
  useEffect(() => {
    Object.values(sounds.current).forEach((a) => {
      a.preload = "auto";
    });

    sounds.current.bg.loop = true;
    sounds.current.bg.volume = 0.25;
    sounds.current.ending.volume = 0.5;
  }, []);

  /* ---------- MOBILE UNLOCK ---------- */
  const unlockAudio = () => {
    if (unlockedRef.current) return;

    Object.values(sounds.current).forEach((a) => {
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      }).catch(() => {});
    });

    unlockedRef.current = true;
  };

  /* ---------- CORE PLAY ---------- */
  const play = (key: keyof typeof sounds.current, volume?: number) => {
    if (mutedRef.current) return;

    const audio = sounds.current[key];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    if (volume !== undefined) audio.volume = volume;

    audio.play().catch(() => {});
  };

  /* ---------- SAFE ENDING ---------- */
  const playEnding = () => {
    if (endingPlayedRef.current || mutedRef.current) return;
    endingPlayedRef.current = true;
    play("ending");
  };

  /* ---------- STOP CONTROLS ---------- */
  const stopEnding = () => {
    sounds.current.ending.pause();
    sounds.current.ending.currentTime = 0;
    endingPlayedRef.current = false;
  };

  const playBg = () => {
    if (mutedRef.current) return;
    sounds.current.bg.play().catch(() => {});
  };

  const stopBg = () => {
    sounds.current.bg.pause();
    sounds.current.bg.currentTime = 0;
  };

  const stopAll = () => {
    Object.values(sounds.current).forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    endingPlayedRef.current = false;
  };

  /* ---------- MUTE ---------- */
  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;

    if (mutedRef.current) {
      stopAll();
    } else {
      playBg();
    }

    return mutedRef.current;
  };

  return {
    unlockAudio,
    toggleMute,
    playBg,
    stopBg,

    playWin: () => play("win", 0.7),
    playLose: () => play("lose", 0.6),
    playPerfect: () => play("perfect", 0.6),
    playDanger: () => play("danger", 0.6),
    playEnding,

    stopEnding,
    stopAll,
  };
};