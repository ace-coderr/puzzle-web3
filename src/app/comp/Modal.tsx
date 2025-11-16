type ModalProps = {
  title: string;
  message?: string;
  show: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  singleButton?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "success" | "start";
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
  variant = "default",
}: ModalProps) {
  if (!show) return null;

  const bgColor = variant === "success" ? "bg-green-600" : "bg-blue-600";
  const hoverColor = variant === "success" ? "hover:bg-green-700" : "hover:bg-blue-700";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white text-center w-80">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        {message && <p className="mb-4 whitespace-pre-line">{message}</p>}
        {children && <div className="mb-3">{children}</div>}
        <button
          onClick={onConfirm || onClose}
          className={`${bgColor} ${hoverColor} w-full px-6 py-3 rounded-lg font-semibold text-lg mt-4`}
        >
          {confirmText || "OK"}
        </button>
      </div>
    </div>
  );
}