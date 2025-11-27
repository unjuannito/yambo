import { useState, useRef, useEffect, useId } from "react";
import { LabelComponent } from "./LabelComponent";

interface MultiSelectProps {
    label?: string;
    value?: string[];
    options?: { value: string; label: string }[];
    placeholder?: string;
    onChange?: (value: string[]) => void;
    className?: string;
    required?: boolean;
}

export function MultiSelectComponent({
    label,
    value = [],
    options = [],
    placeholder = "Seleccionar...",
    onChange,
    className = "",
    required = false,
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputId = useId();

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter((v) => v !== optionValue)
            : [...value, optionValue];
        onChange?.(newValue);
    };

    const removeOption = (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.(value.filter((v) => v !== optionValue));
    };

    const getOptionLabel = (optionValue: string) => {
        return (
            options.find((opt) => opt.value === optionValue)?.label ||
            optionValue
        );
    };

    const multiselectElement = (
        <div className={`relative`} ref={dropdownRef}>
            <button
                type="button"
                id={inputId}
                className={`w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center ${className}`}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
            >
                {value.length > 0 ? (
                    <span className="flex gap-1 flex-wrap " style={{maxHeight: '28px', overflowY: 'auto' }}>
                        {value.map((item) => (
                            <span
                                key={item}
                                className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap flex-shrink-0 max-w-[150px]"
                            >
                                <span className="truncate">
                                    {getOptionLabel(item)}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => removeOption(item, e)}
                                    className="hover:bg-blue-300 rounded-full p-0.5 ml-1 flex-shrink-0"
                                >
                                    X
                                </button>
                            </span>
                        ))}
                    </span>
                ) : (
                    <span className="text-gray-400 px-2 py-1" style={{maxHeight: '28px'}}>{placeholder}</span>
                )}
                <span className={`w-5 h-5 text-gray-400 flex-shrink-0 `}>
                    ▼
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={value.includes(option.value)}
                                        onChange={() =>
                                            toggleOption(option.value)
                                        }
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                                    />
                                    <span className="ml-3 text-gray-700 truncate">
                                        {option.label}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (!label) {
        return multiselectElement;
    }

    return (
        <LabelComponent
            label={label}
            required={required}
            htmlFor={inputId}
        >
            {multiselectElement}
        </LabelComponent>
    );
}
