"use client";

type ModalProps = {
  title: string;
  message: string;
  show: boolean;
  onClose: () => void;
  onConfirm?: () => void; // optional
  confirmText?: string;   // optional
  singleButton?: boolean; // 👈 new prop to show only "Close"
  children?: React.ReactNode;
};

export default function Modal({
  title,
  message,
  show,
  onClose,
  onConfirm,
  confirmText,
  singleButton = false,
  children,
}: ModalProps) {
  if (!show) return null;

  return (
    // 🔹 BACKDROP with blur and dim
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 transition-all duration-300">
      {/* 🔹 MODAL BOX */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white text-center w-80 transform scale-100 transition-all duration-300">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="mb-4 whitespace-pre-line">{message}</p>

        {children && <div className="mb-3">{children}</div>}

        <div className="flex justify-center gap-3">
          {/* Always show Close */}
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
          >
            Close
          </button>

          {/* Show Confirm only if not single-button */}
          {!singleButton && onConfirm && confirmText && (
            <button
              onClick={onConfirm}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}