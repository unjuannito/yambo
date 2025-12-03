import React from "react";
import { LabelComponent } from "./LabelComponent";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    description?: string;
    variant?: "checkbox" | "toggle";
    required?: boolean;
}

export function CheckboxComponent({
    label,
    description,
    className = "",
    variant = "checkbox",
    required,
    ...props
}: CheckboxProps) {
    const checkboxInput = (
        <input
            type="checkbox"
            className={`mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${className}`}
            {...props}
        />
    );

    const toggleInput = (
        <span className="relative inline-block w-10 h-6">
            <input
                type="checkbox"
                className="peer opacity-0 w-10 h-6 absolute left-0 top-0 cursor-pointer"
                {...props}
            />
            <span className="block bg-gray-300 peer-checked:bg-blue-600 w-10 h-6 rounded-full transition-colors" />
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </span>
    );

    const input = variant === "checkbox" ? checkboxInput : toggleInput;

    if (!label) {
        return input;
    }

    return (
        <LabelComponent label={label} required={required} className="flex flex-row items-center">
            {input}
        </LabelComponent>
    );
}
