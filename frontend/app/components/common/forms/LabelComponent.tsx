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
    htmlFor: f,
}: LabelProps) {
    return (
        <label
            className={`block font-medium text-gray-700 mb-1 ${className}`}
            {...(f ? { htmlFor: f } : {})}
        >
            <span className="text-md px-1 py-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
