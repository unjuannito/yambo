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

    const validationRules = {
        email: {
            pattern: undefined,
            title: "Por favor, introduce un correo electrónico válido.",
        },
        tel: {
            pattern: "[0-9]{9}",
            title: "Por favor, introduce un número de teléfono válido de 9 dígitos.",
        },
        password: {
            pattern: pattern || ".{6,}",
            title: "La contraseña debe tener al menos 6 caracteres.",
        },
    };

    const currentRule = validationRules[type as keyof typeof validationRules];
    const inputPattern = currentRule?.pattern ?? pattern;
    const inputTitle = currentRule?.title;

    const input = (
        <div className="relative">
            <input
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${type === "password" ? "pr-10" : ""} ${className}`}
                type={inputType}
                pattern={inputPattern}
                title={inputTitle}
                name={label || undefined}
                {...props}
            />
            {type === "password" && (
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                        showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                    onClick={() => setShowPassword((v) => !v)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowPassword((v) => !v);
                        }
                    }}
                >
                    <img
                        src={showPassword ? "/icons/eye-slash.svg" : "/icons/eye.svg"}
                        alt={showPassword ? "Ocultar" : "Mostrar"}
                        className="w-5 h-5"
                    />
                </div>
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
