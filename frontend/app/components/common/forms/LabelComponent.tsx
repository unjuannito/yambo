import React from "react";
import { twMerge } from "tailwind-merge";

interface LabelProps extends React.SelectHTMLAttributes<HTMLLabelElement>{
    label: string;
    required?: boolean;
    ref?: React.Ref<HTMLLabelElement>
}

export default function LabelComponent({
    children,
    label,
    required,
    className = "",
    ref,
    ...props
}: LabelProps) {
    return (
        <label className={twMerge(`flex flex-col font-medium text-gray-700 gap-1 ${className}`)} {...props} ref={ref}>
            <span className="text-md py-1 px-2 font-semibold truncate">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
