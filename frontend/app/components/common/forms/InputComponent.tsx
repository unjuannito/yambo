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
        <div className="relative">
            <input
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${type === "password" ? "pr-10" : ""} ${className}`}
                type={inputType}
                pattern={getDefaultPattern()}
                name={label || undefined}
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
                    <img
                        src={showPassword ? "/icons/eye-slash.svg" : "/icons/eye.svg"}
                        alt={showPassword ? "Ocultar" : "Mostrar"}
                        className="w-5 h-5"
                    />
                </button>
            )}
        </div>
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
