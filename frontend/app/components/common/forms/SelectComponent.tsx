import { twMerge } from "tailwind-merge";
import LabelComponent from "./LabelComponent";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
}

export default function SelectComponent({
  label,
  className = "",
  options = [],
  ...props
}: SelectProps) {
  const selectElement = (
    <select
      className={twMerge(
        `w-full border border-gray-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 transition-all duration-200 ${className}`
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return selectElement;
  }

  return (
    <LabelComponent label={label} required={props.required}>
      {selectElement}
    </LabelComponent>
  );
}
