interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    description?: string;
}

export function Checkbox({
    label,
    description,
    className = '',
    ...props
}: CheckboxProps) {
    return (
        <label className="flex items-start cursor-pointer">
            <input
                type="checkbox"
                className={`mr-2 mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
                {...props}
            />
            <div>
                <span className="font-medium text-gray-900">{label}</span>
                {description && (
                    <p className="text-sm text-gray-600">{description}</p>
                )}
            </div>
        </label>
    );
}
