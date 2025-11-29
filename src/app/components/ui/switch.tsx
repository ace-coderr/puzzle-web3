"use client";

import React from "react";

type SwitchProps = {
    enabled: boolean;
    setEnabled: (value: boolean) => void;
};

export default function Switch({ enabled, setEnabled }: SwitchProps) {
    return (
        <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-7 rounded-full transition 
                ${enabled ? "bg-green-500" : "bg-gray-600"}`}
        >
            <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform
                    ${enabled ? "translate-x-7" : "translate-x-0"}`}
            />
        </button>
    );
}