"use client";

import { X } from "lucide-react";

interface ModalProps {
  title?: string;
  message?: string;
  show: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  singleButton?: boolean;
  variant?: "default" | "success" | "start" | "leaderboard";
  children?: React.ReactNode;
  hideFooter?: boolean;
  hideCloseButton?: boolean;
}

export default function Modal({
  title,
  message,
  show,
  onClose,
  onConfirm,
  confirmText = "OK",
  singleButton,
  variant = "default",
  children,
  hideFooter = false,
  hideCloseButton = false,
}: ModalProps) {
  if (!show) return null;

  const styles = {
    default: {
      bg: "bg-zinc-950/95",
      border: "border-zinc-700",
      accent: "text-zinc-200",
      button: "from-zinc-700 to-zinc-600",
    },
    start: {
      bg: "bg-gradient-to-br from-blue-950 to-indigo-950",
      border: "border-blue-500/40",
      accent: "text-blue-300",
      button: "from-blue-500 to-indigo-500",
    },
    success: {
      bg: "bg-gradient-to-br from-emerald-950 to-teal-950",
      border: "border-emerald-500/40",
      accent: "text-emerald-300",
      button: "from-emerald-500 to-teal-500",
    },
    leaderboard: {
      bg: "bg-gradient-to-br from-purple-950 to-fuchsia-950",
      border: "border-purple-500/40",
      accent: "text-purple-300",
      button: "from-purple-500 to-fuchsia-500",
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div
        className={`
          relative w-full max-w-xl mx-4
          rounded-2xl border ${styles.border}
          ${styles.bg}
          shadow-[0_20px_80px_rgba(0,0,0,0.8)]
          px-8 py-10
          animate-in fade-in zoom-in-95 duration-300
        `}
      >
        {/* CLOSE BUTTON */}
        {onClose && !hideCloseButton && (
          <button
            onClick={onClose}
            className="
              absolute top-4 right-4
              p-2 rounded-full
              bg-white/5 hover:bg-white/10
              transition
            "
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        )}

        {/* TITLE */}
        {title && (
          <h2 className="text-3xl font-extrabold text-center text-white mb-4 tracking-tight">
            {title}
          </h2>
        )}

        {/* MESSAGE */}
        {message && (
          <p className="text-center text-base text-white/70 max-w-md mx-auto mb-6">
            {message}
          </p>
        )}

        {/* BODY */}
        {children && <div className="mb-8">{children}</div>}

        {/* FOOTER */}
        {!hideFooter && (
          <div className="flex justify-center gap-4">
            {onConfirm && (
              <button
                onClick={onConfirm}
                className={`
                  px-8 py-4 rounded-xl
                  text-lg font-bold text-white
                  bg-gradient-to-r ${styles.button}
                  hover:brightness-110
                  active:scale-95
                  transition
                `}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}