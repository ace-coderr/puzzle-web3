"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";

/* =====================================================
   TYPES
   ===================================================== */
type SoundContextType = {
  unlockAudio: () => void;
  setMuted: (v: boolean) => void;
  stopAll: () => void;

  playBg: () => void;
  stopBg: () => void;

  playEnding: () => void;
  stopEnding: () => void;

  playWin: () => void;
  playLose: () => void;
  playPerfect: () => void;
  playDanger: () => void;
};

/* =====================================================
   CONTEXT
   ===================================================== */
const SoundContext = createContext<SoundContextType | null>(null);

/* =====================================================
   PROVIDER
   ===================================================== */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const unlockedRef = useRef(false); // 📱 mobile unlock
  const mutedRef = useRef(false);

  const bgRef = useRef<HTMLAudioElement | null>(null);
  const endingRef = useRef<HTMLAudioElement | null>(null);

  /* ---------- helpers ---------- */
  const canPlay = () => unlockedRef.current && !mutedRef.current;

  const unlockAudio = () => {
    unlockedRef.current = true;
  };

  const setMuted = (v: boolean) => {
    mutedRef.current = v;
    if (v) stopAll();
  };

  const stopAll = () => {
    bgRef.current?.pause();
    endingRef.current?.pause();
    bgRef.current && (bgRef.current.currentTime = 0);
    endingRef.current && (endingRef.current.currentTime = 0);
  };

  /* ---------- background ---------- */
  const playBg = () => {
    if (!canPlay()) return;

    if (!bgRef.current) {
      bgRef.current = new Audio("/sounds/bg.mp3");
      bgRef.current.loop = true;
      bgRef.current.volume = 0.4;
    }

    bgRef.current.play().catch(() => {});
  };

  const stopBg = () => {
    bgRef.current?.pause();
    if (bgRef.current) bgRef.current.currentTime = 0;
  };

  /* ---------- ending ---------- */
  const playEnding = () => {
    if (!canPlay()) return;

    if (!endingRef.current) {
      endingRef.current = new Audio("/sounds/ticking.mp3");
      endingRef.current.loop = true;
      endingRef.current.volume = 0.7;
    }

    endingRef.current.play().catch(() => {});
  };

  const stopEnding = () => {
    endingRef.current?.pause();
    if (endingRef.current) endingRef.current.currentTime = 0;
  };

  /* ---------- one-shots ---------- */
  const playOne = (src: string, volume = 0.8) => {
    if (!canPlay()) return;
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  };

  return (
    <SoundContext.Provider
      value={{
        unlockAudio,
        setMuted,
        stopAll,

        playBg,
        stopBg,

        playEnding,
        stopEnding,

        playWin: () => playOne("/sounds/win.mp3"),
        playLose: () => playOne("/sounds/lose.mp3"),
        playPerfect: () => playOne("/sounds/perfect.mp3"),
        playDanger: () => playOne("/sounds/danger.mp3"),
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

/* =====================================================
   HOOK
   ===================================================== */
export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used inside <SoundProvider>");
  }
  return ctx;
}