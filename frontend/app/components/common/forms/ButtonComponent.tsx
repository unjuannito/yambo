import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    helperText?: string;
    variant?: 'primary' | 'secondary';
}

const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
};

const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
};

export function ButtonComponent({
    label,
    size = 'md',
    isLoading = false,
    disabled,
    className = '',
    helperText,
    children,
    variant = 'primary',
    ...props
}: ButtonProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}
            <button
                disabled={disabled || isLoading}
                className={`bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando...
                    </span>
                ) : (
                    children
                )}
            </button>
            {helperText && (
                <p className="text-gray-500 text-xs mt-1">{helperText}</p>
            )}
        </div>
    );
}
