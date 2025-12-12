import React from "react";
import LabelComponent from "./LabelComponent";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    description?: string;
    className?: string;
    variantType?: "checkbox" | "toggle";
    variant?:
        | "top"
        | "bottom"
        | "left"
        | "right"
        | "left-with-description"
        | "right-with-description"
        | "left-with-inline-description"
        | "right-with-inline-description"; // Variantes de disposición del texto
}

// Componente Checkbox
function Checkbox({ className = "", ...props }) {
    return (
        <input
            type="checkbox"
            className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${className}`}
            {...props}
        />
    );
};

// Componente Toggle
function Toggle({ className = "", ...props }) {
    return (
        <span className={`relative inline-block w-10 h-6 ${className}`}>
            <input
                type="checkbox"
                className="peer opacity-0 w-10 h-6 absolute left-0 top-0 cursor-pointer"
                {...props}
            />
            <span className="block bg-gray-300 peer-checked:bg-blue-600 w-10 h-6 rounded-full transition-colors" />
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </span>
    );
};

export default function CheckboxComponent({
    label,
    description = "Mostrar solo los habilitados",
    className = "",
    variantType = "checkbox",
    variant = "right",
    ...props
}: CheckboxProps) {

    const CheckboxInput = variantType === "checkbox" ? Checkbox : Toggle;

    if (!label) return <CheckboxInput className={className} {...props} />;

    const labelClass = {
        right: "",
        left: "flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer gap-2",
        top: "",
        bottom: "",
        "left-with-description": "",
        "right-with-description": "flex justify-between",
        "left-with-inline-description": "",
        "right-with-inline-description": "",
    };

    const inputClass = {
        right: "",
        left: "order-first w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0",
        top: "",
        bottom: "",
        "left-with-description": "",
        "right-with-description": "self-center mx-2",
        "left-with-inline-description": "",
        "right-with-inline-description": "",
    };

    const titleClass = {
        right: "",
        left: "text-md p-1 font-semibold",
        top: "",
        bottom: "",
        "left-with-description": "",
        "right-with-description": "text-md py-1 px-2 font-semibold",
        "left-with-inline-description": "",
        "right-with-inline-description": "",
    }

    const descClass = {
        right: "",
        left: "",
        top: "",
        bottom: "",
        "left-with-description": "",
        "right-with-description": "inline-flex  text-sm px-3 h-[42px] items-center text-ellipsis",
        "left-with-inline-description": "",
        "right-with-inline-description": "",
    }

    return (
        <label className={labelClass[variant]}>
            <div className="flex flex-col gap-1">
                <span className={titleClass[variant]}>
                    {label}
                </span>
                {description && variant.includes("description") && (
                    <span className={descClass[variant]}>{description}</span>
                )}
            </div>
            <CheckboxInput className={inputClass[variant]} {...props} />
        </label>
    );
}
