import React, { useState } from "react";
import { LabelComponent } from "./LabelComponent";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    pattern?: string;
}

export function InputComponent({
    label,
    className = "",
    type = "text",
    pattern,
    ...props
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const inputType =
        type === "password" ? (showPassword ? "text" : "password") : type;

    const getDefaultPattern = () => {
        if (type === "email") return undefined;
        if (type === "tel") return "^[0-9()+\-\s]{7,}$";
        if (type === "password") return pattern || ".{6,}";
        return pattern;
    };

    const input = (
        <>
            <input
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
                type={inputType}
                pattern={getDefaultPattern()}
                {...props}
            />
            {type === "password" && (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={
                        showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                >
                    {showPassword ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 3l18 18z"
                            />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    )}
                </button>
            )}
        </>
    );

    if (!label) {
        return input;
    }

    return (
        <LabelComponent label={label} className={className}>
            {input}
        </LabelComponent>
    );
}
