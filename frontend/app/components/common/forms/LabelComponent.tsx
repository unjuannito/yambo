import React from "react";

interface LabelProps {
    children?: React.ReactNode;
    label: string;
    required?: boolean;
    className?: string;
    htmlFor?: string;
}

export function LabelComponent({
    children,
    label,
    required,
    className = "",
    htmlFor : f,
}: LabelProps) {
    return (
        <label
            className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
            {...(f ? { htmlFor: f } : {})}
        >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {children}
        </label>
    );
}
