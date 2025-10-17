"use client";

type ModalProps = {
  title: string;
  message: string;
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
};

export default function Modal({
  title,
  message,
  show,
  onClose,
  onConfirm,
  confirmText,
}: ModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-gray-900 p-6 rounded-2xl shadow-xl max-w-sm w-[90%] relative animate-scale-in">
        {/* Title */}
        <h2 className="text-2xl font-bold mb-3 text-center">{title}</h2>

        {/* Message */}
        <p className="text-center whitespace-pre-line mb-6 text-gray-700">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold transition"
          >
            Close
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}