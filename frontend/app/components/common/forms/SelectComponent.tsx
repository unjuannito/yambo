interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options?: { value: string; label: string }[];
    value?: string;
}

export function SelectComponent({
    label,
    className = '',
    options = [],
    value,
    ...props
}: SelectProps) {
    return (
        <label>
            {label}{props.required && <span className="text-red-500 ml-1">*</span>}
            <select
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 ${className}`}
                {...props}
            >
                {
                    options.map( option => (
                        <option value={option.value}>
                            {option.label}
                        </option>
                    ))
                }
            </select>
        </label>
    );
}
