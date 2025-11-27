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

  // Backgrounds & borders
  const bgColor = {
    default: "bg-gradient-to-br from-red-900/95 to-red-950/95",
    success: "bg-gradient-to-br from-emerald-900/95 via-teal-900/95 to-green-900/95",
    start: "bg-gradient-to-br from-blue-900/95 to-indigo-900/95",
    leaderboard: "bg-gradient-to-br from-purple-900/95 to-pink-900/90",
  }[variant];

  const borderGlow = {
    default: "border-red-500/60 shadow-red-500/20",
    success: "border-emerald-400/70 shadow-emerald-500/40",
    start: "border-blue-400/70 shadow-blue-500/40",
    leaderboard: "border-purple-400/70 shadow-purple-500/40",
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/80">
      <div
        className={`relative w-full max-w-lg mx-4 p-10 rounded-3xl shadow-2xl border-2 ${bgColor} ${borderGlow} text-white
                    transform transition-all duration-500 animate-in fade-in zoom-in-95`}
      >
        {/* X BUTTON */}
        {onClose && !hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-12 h-12 rounded-full 
                       bg-white/5 backdrop-blur-xl border border-white/20
                       hover:bg-emerald-500/20 hover:border-emerald-400/60 
                       hover:shadow-2xl hover:shadow-emerald-500/30
                       active:scale-90
                       transition-all duration-300 
                       flex items-center justify-center"
          >
            <X className="w-7 h-7 text-white/60 hover:text-emerald-300 transition" />
          </button>
        )}

        {/* Title */}
        {title && (
          <h2 className="text-4xl font-black text-center mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
            {title}
          </h2>
        )}

        {/* Message */}
        {message && (
          <p className="text-center text-lg text-white/80 mb-8 leading-relaxed">
            {message}
          </p>
        )}

        {children && <div className="text-center mb-10">{children}</div>}

        {/* Footer Buttons */}
        {!hideFooter && (
          <div className="flex justify-center gap-5">
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 
                   hover:from-emerald-400 hover:to-teal-500
                   active:scale-95
                   text-white font-black text-xl rounded-2xl 
                   shadow-2xl shadow-emerald-600/50
                   transform transition-all duration-300 
                   hover:shadow-emerald-500/60 hover:scale-105"
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