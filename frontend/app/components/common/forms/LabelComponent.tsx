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
        <label className={twMerge(`flex flex-col font-medium text-yambo-black gap-1.5 ${className}`)} {...props} ref={ref}>
            <span className="text-md py-1 px-2 font-semibold truncate">
                {label}
                {required && <span className="text-yambo-coral ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
