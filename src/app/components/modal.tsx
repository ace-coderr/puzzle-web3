"use client";

import { X } from "lucide-react";

interface ModalRootProps {
  show: boolean;
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export default function Modal({
  show,
  title,
  onClose,
  children,
}: ModalRootProps) {
  if (!show) return null;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "transparent",
              border: "none",
              color: "#888",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        )}

        {title && <div className="confirm-title">{title}</div>}

        {children}
      </div>
    </div>
  );
}
