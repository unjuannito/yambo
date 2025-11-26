import React from "react";
import { LabelComponent } from "./LabelComponent";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    size?: "sm" | "md" | "lg";
    variant?: "primary" | "secondary";
    required?: boolean;
}

const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
};

const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
};
export function ButtonComponent({
    label,
    size = "md",
    disabled,
    className = "",
    variant = "primary",
    required,
    ...props
}: ButtonProps) {
    const buttonInput = (
        <button
            disabled={disabled}
            className={`rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {props.children}
        </button>
    );

    return label ? (
        <LabelComponent label={label} required={required} className={className}>
            {buttonInput}
        </LabelComponent>
    ) : (
        buttonInput
    );
}
