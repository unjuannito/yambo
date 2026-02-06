import React from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: "sm" | "md" | "lg";
    variant?:
        | "base"
        | "neutral"
        | "primary"
        | "primary-outline"
        | "destructive"
        | "destructive-text"
        | "success";
    loading?: boolean;
}

const variantClasses = {
    base: "bg-transparent border-transparent text-blue-600 hover:text-blue-700",
    neutral:
        "bg-white border-gray-300 text-blue-600 hover:bg-gray-50 hover:border-blue-500",
    primary:
        "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700",
    "primary-outline":
        "bg-white border-blue-600 text-blue-600 hover:bg-blue-50",
    destructive:
        "bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700",
    "destructive-text":
        "bg-white border-gray-300 text-red-600 hover:bg-gray-50 hover:border-red-600",
    success:
        "bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600",
};

const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-2.5 text-lg",
};

export default function ButtonComponent({
    size = "md",
    disabled,
    className = "",
    variant = "neutral",
    loading = false,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={twMerge(`
            inline-flex items-center justify-center
            text-center font-medium
            border border-solid rounded
            transition-[border] duration-150 ease-linear
            select-none whitespace-normal
            cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${loading ? "disabled:cursor-wait" : ""}
            ${className}
            `)}
            {...props}
        >
            {props.children}
        </button>
    );
}
