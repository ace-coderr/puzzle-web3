// src/components/modal.tsx
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
  hideFooter?: boolean;   // ← NEW PROP ADDED
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
  hideFooter = false,     // ← default false (shows footer)
}: ModalProps) {
  if (!show) return null;

  const bgColor = {
    default: "bg-red-900/90",
    success: "bg-green-900/90",
    start: "bg-blue-900/90",
    leaderboard: "bg-purple-900/90",
  }[variant];

  const borderColor = {
    default: "border-red-600",
    success: "border-green-600",
    start: "border-blue-600",
    leaderboard: "border-purple-600",
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60">
      <div
        className={`relative w-full max-w-md p-6 rounded-2xl shadow-2xl border ${bgColor} ${borderColor} text-white transform transition-all scale-100`}
      >
        {/* CLOSE BUTTON (X) - Always visible if onClose exists */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 transition flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Title */}
        {title && (
          <h2 className="text-2xl font-bold text-center mb-4 pr-10">
            {title}
          </h2>
        )}

        {/* Message */}
        {message && (
          <p className="text-center text-lg mb-6">{message}</p>
        )}

        {/* Custom Children (e.g. +1.200000 SOL) */}
        {children && <div className="text-center mb-6">{children}</div>}

        {/* Footer Buttons - Only show if hideFooter is false */}
        {!hideFooter && (
          <div className="flex justify-center gap-3">
            {onConfirm && !singleButton && (
              <button
                onClick={onConfirm}
                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
              >
                {confirmText}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/20 hover:bg-white/40 font-bold rounded-lg transition"
              >
                {singleButton ? "Restart" : "Close"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}