import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    description?: string;
    variant?: 'checkbox' | 'toggle';
}

export function CheckboxComponent({
    label,
    description,
    className = '',
    variant = 'checkbox',
    ...props
}: CheckboxProps) {
    return (
        <label className={`flex items-center cursor-pointer select-none ${variant === 'toggle' ? 'gap-3' : ''}`}>
            {variant === 'checkbox' ? (
                <input
                    type="checkbox"
                    className={`mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${className}`}
                    {...props}
                />
            ) : (
                <span className="relative inline-block w-10 h-6">
                    <input
                        type="checkbox"
                        className="peer opacity-0 w-10 h-6 absolute left-0 top-0 cursor-pointer"
                        {...props}
                    />
                    <span className="block bg-gray-300 peer-checked:bg-blue-600 w-10 h-6 rounded-full transition-colors"></span>
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></span>
                </span>
            )}
            <div>
                <span className="font-medium text-gray-900">{label}</span>
                {description && (
                    <p className="text-sm text-gray-600">{description}</p>
                )}
            </div>
        </label>
    );
}
