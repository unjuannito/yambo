import React from "react";

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

const sizeClasses = {
    sm: "px-3 py-1 text-sm leading-6",
    md: "px-4 py-0 leading-[1.875rem]",
    lg: "px-6 py-1 text-lg leading-8",
};

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

export function ButtonComponent({
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
            className={`
            inline-flex items-center justify-center
            text-center font-medium
            border border-solid rounded
            transition-[border] duration-150 ease-linear
            select-none whitespace-normal
            cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${className}
            `}
            {...props}
        >
            {loading && (
                <svg
                    className="absolute animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            <span className={loading ? "invisible" : ""}>{props.children}</span>
        </button>
    );
}
