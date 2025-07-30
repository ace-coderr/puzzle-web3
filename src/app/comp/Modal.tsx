import React from "react";

interface ModalProps {
    show: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
    confirmText?: string;
}

const Modal: React.FC<ModalProps> = ({
    show,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = "OK",
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex justify-center items-center z-50">
            <div className="bg-white over-bg rounded shadow-lg text-center max-w-md">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
                <div className="mt-6 flex justify-center gap-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-900 rounded text-white hover:bg-gray-400 over-btn"
                    >
                        Close
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-gray-900 text-white rounded hover:bg-gray-400 over-btn"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
