import React from "react";
import LabelComponent from "./LabelComponent";
import { twMerge } from "tailwind-merge";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  variantType?: "checkbox" | "toggle";
  variant?:
    | "left"
    | "right"
    | "left-with-description"
    | "right-with-description";
}

function Checkbox({ className = "", ...props }: any) {
  return (
    <input
      type="checkbox"
      className={twMerge(
        `w-6 h-6 scale-80 text-yambo-green-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 ${className}`
      )}
      {...props}
    />
  );
}

function Toggle({ className = "", ...props }: any) {
  return (
    <span className={twMerge(`relative inline-block w-10 h-6 ${className}`)}>
      <input
        type="checkbox"
        className="peer opacity-0 w-10 h-6 absolute left-0 top-0 cursor-pointer"
        {...props}
      />
      <span className="block bg-gray-200 peer-checked:bg-yambo-green-500 w-10 h-6 rounded-full transition-colors" />
      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
    </span>
  );
}

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
    right:
      "flex justify-between items-center px-4 py-2.5 hover:bg-yambo-green-50/50 cursor-pointer gap-2 rounded-xl transition-colors",
    left:
      "flex items-center px-4 py-2.5 hover:bg-yambo-green-50/50 cursor-pointer gap-2 rounded-xl transition-colors",
    top: "",
    bottom: "",
    "left-with-description": "flex",
    "right-with-description": "flex justify-between",
    "left-with-inline-description": "",
    "right-with-inline-description": "",
  };

  const inputClass = {
    right: `order-last ${variantType === "checkbox" ? "w-4 h-4" : "w-10 h-6"} text-yambo-green-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 flex-shrink-0`,
    left: `order-first ${variantType === "checkbox" ? "w-4 h-4" : "w-10 h-6"} text-yambo-green-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 flex-shrink-0`,
    top: "",
    bottom: "",
    "right-with-description": "self-center mx-2 order-last",
    "left-with-description": "self-top my-1 order-first",
    "left-with-inline-description": "",
    "right-with-inline-description": "",
  };

  const titleClass = {
    right: "text-md p-1 font-semibold truncate",
    left: "text-md p-1 font-semibold truncate",
    top: "",
    bottom: "",
    "left-with-description": "text-md py-1 px-2 font-semibold",
    "right-with-description": "text-md py-1 px-2 font-semibold",
    "left-with-inline-description": "",
    "right-with-inline-description": "",
  };

  const descClass = {
    right: "",
    left: "",
    top: "",
    bottom: "",
    "left-with-description":
      "inline-flex text-sm px-2 h-[42px] items-center text-ellipsis",
    "right-with-description":
      "inline-flex text-sm px-2 h-[42px] items-center text-ellipsis",
    "left-with-inline-description": "",
    "right-with-inline-description": "",
  };

  return (
    <label className={twMerge(`truncate ${labelClass[variant]}`)}>
      <div className="flex flex-col gap-1 text-ellipsis">
        <span className={twMerge(`text-ellipsis ${titleClass[variant]}`)}>
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
