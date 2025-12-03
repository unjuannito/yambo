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
            className={`flex flex-col font-medium text-gray-700 gap-1 ${className}`}
            {...(f ? { htmlFor: f } : {})}
        >
            <span className="text-md py-1 px-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
