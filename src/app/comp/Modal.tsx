"use client";

type ModalProps = {
  title: string;
  message: string;
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  children?: React.ReactNode;
};

export default function Modal({
  title,
  message,
  show,
  onClose,
  onConfirm,
  confirmText,
  children,
}: ModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white text-center w-80">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="mb-4 whitespace-pre-line">{message}</p>
        {children && <div className="mb-3">{children}</div>}
        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}