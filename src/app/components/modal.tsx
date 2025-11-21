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
  hideFooter?: boolean; // ← Keep this!
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
}: ModalProps) {
  if (!show) return null;

  const bgColor = {
    default: "bg-red-900/90",
    success: "bg-gradient-to-br from-emerald-900/95 to-green-900/95",
    start: "bg-blue-900/90",
    leaderboard: "bg-purple-900/90",
  }[variant];

  const borderColor = {
    default: "border-red-600",
    success: "border-emerald-500 shadow-emerald-500/50",
    start: "border-blue-600",
    leaderboard: "border-purple-600",
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/70">
      <div
        className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl border-2 ${bgColor} ${borderColor} text-white transform transition-all animate-in fade-in zoom-in duration-300`}
      >
        {/* X Button — Always visible */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-sm transition flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Title */}
        {title && (
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">
            {title}
          </h2>
        )}

        {/* Message */}
        {message && (
          <p className="text-center text-lg text-gray-200 mb-6">
            {message}
          </p>
        )}

        {/* Custom Content (e.g. Reward Amount) */}
        {children && <div className="text-center mb-8">{children}</div>}

        {/* Footer — Only show if hideFooter = false */}
        {!hideFooter && (
          <div className="flex justify-center gap-4">
            {/* Confirm Button (Claim Reward) */}
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xl rounded-2xl shadow-lg transform hover:scale-105 active:scale-95 transition-all"
              >
                {confirmText}
              </button>
            )}

            {/* Optional Close Button — only if not singleButton */}
            {onClose && !singleButton && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/20 hover:bg-white/40 font-bold rounded-xl transition"
              >
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}