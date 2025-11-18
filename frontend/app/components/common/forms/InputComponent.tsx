
import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    pattern?: string;
}

export function InputComponent({
    label,
    error,
    helperText,
    className = '',
    type = 'text',
    pattern,
    ...props
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

    const getDefaultPattern = () => {
        if (type === 'email') return '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
        if (type === 'tel') return '^[0-9()+\-\s]{7,}$';
        if (type === 'password') return pattern || '.{6,}';
        return pattern;
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
                    type={inputType}
                    pattern={getDefaultPattern()}
                    {...props}
                />
                {type === 'password' && (
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword((v) => !v)}
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-5.12M15 12a3 3 0 01-3 3m0-6a3 3 0 013 3m-3-3a3 3 0 00-3 3m0 0a3 3 0 003 3m0 0a3 3 0 01-3-3" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
            {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-gray-500 text-xs mt-1">{helperText}</p>
            )}
        </div>
    );
}
