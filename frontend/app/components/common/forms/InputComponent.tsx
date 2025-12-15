import React, { useState } from "react";
import LabelComponent from "./LabelComponent";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export default function InputComponent({
    label,
    className = "",
    ...props
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);

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
            pattern: props.pattern || ".{6,}",
            title: "La contraseña debe tener al menos 6 caracteres.",
        },
    };

    const currentRule = validationRules[props.type as keyof typeof validationRules];
    const inputPattern = props.pattern ?? currentRule?.pattern;
    const inputTitle = props.title ?? currentRule?.title ?? "";

    const inputPassword = (
        <div className="relative">
            <input
                className={twMerge(`w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`)}
                pattern={inputPattern}
                title={inputTitle}
                name={label || undefined}
                {...props}
                type={showPassword ? "text" : "password"}
            />
            <button
                type="button"
                tabIndex={0}
                aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
            >
                <img
                    src={
                        showPassword ? "/icons/eye-slash.svg" : "/icons/eye.svg"
                    }
                    alt={showPassword ? "Ocultar" : "Mostrar"}
                    className="w-5 h-5"
                />
            </button>
        </div>
    );

    const input =
        props.type === "password" ? (
            inputPassword
        ) : (
            <input
                className={twMerge(`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`)}
                pattern={inputPattern}
                title={inputTitle}
                name={label || undefined}
                {...props}
            />
        );

    if (!label) {
        return input;
    }

    return <LabelComponent label={label}>{input}</LabelComponent>;
}
