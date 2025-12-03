import { LabelComponent } from "./LabelComponent";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options?: { value: string; label: string }[];
}

export function SelectComponent({
    label,
    className = "",
    options = [],
    ...props
}: SelectProps) {
    const selectElement = (
        <select
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
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
        <LabelComponent
            label={label}
            required={props.required}
        >
            {selectElement}
        </LabelComponent>
    );
}
