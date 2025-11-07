import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";

interface MultiSelectProps {
    label?: string;
    value?: string[];
    options?: { value: string; label: string }[];
    placeholder?: string;
    onChange?: (value: string[]) => void;
    error?: string;
    helperText?: string;
    className?: string;
}

export function MultiSelect({
    label,
    value = [],
    options = [],
    placeholder = "Seleccionar...",
    onChange,
    error,
    helperText,
    className = '',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggleOption = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];

        onChange?.(newValue);
    };

    const handleRemoveTag = (optionValue: string) => {
        const newValue = value.filter(v => v !== optionValue);
        onChange?.(newValue);
    };

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedLabels = options
        .filter(option => value.includes(option.value))
        .map(option => option.label);

    return (
        <div className={`w-full ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            {/* Selected values display */}
            <div
                className={`min-h-[38px] w-full border rounded px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                    error ? 'border-red-500' : 'border-gray-300'
                } ${isOpen ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {value.length === 0 ? (
                    <span className="text-gray-500">{placeholder}</span>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {selectedLabels.map((label, index) => {
                            const optionValue = value[index];
                            return (
                                <span
                                    key={optionValue}
                                    className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                    {label}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveTag(optionValue);
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                    {/* Search input */}
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Options */}
                    <div className="py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                                No se encontraron opciones
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                            isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                        }`}
                                        onClick={() => handleToggleOption(option.value)}
                                    >
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}} // Handled by onClick
                                                className="mr-2 text-blue-600 focus:ring-blue-500"
                                            />
                                            {option.label}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-gray-500 text-xs mt-1">{helperText}</p>
            )}
        </div>
    );
}