import {
    useState,
    useRef,
    useEffect,
    useId,
    useLayoutEffect
} from "react";

import LabelComponent from "./LabelComponent";
import ButtonComponent from "./ButtonComponent";
import CheckboxComponent from "./CheckboxComponent";
import { twMerge } from "tailwind-merge";

interface MultiSelectProps extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "defaultValue"
> {
    label?: string;
    value?: string[];
    defaultValue?: string[];
    options?: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    required?: boolean;
}

export default function MultiSelectComponent({
    label,
    value,
    options = [],
    placeholder = "Seleccionar...",
    className = "",
    required,
    name,
    defaultValue,
    ...selectProps
}: MultiSelectProps) {

    const isControlled = value !== undefined;

    const [internalValue, setInternalValue] = useState<string[]>(
        () => value ?? defaultValue ?? []
    );
    const selectedValues = isControlled ? value! : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(selectedValues.length);
    const [reloadValueContainer, setReloadValueContainer] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);
    const multiSelectRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLSpanElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const inputId = useId();

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    /* ===============================
       Sincronizar select nativo
       =============================== */

    const syncSelectValue = (values: string[]) => {
        if (!selectRef.current) return;

        Array.from(selectRef.current.options).forEach(opt => {
            opt.selected = values.includes(opt.value);
        });

        // Dispara change nativo (formularios)
        selectRef.current.dispatchEvent(
            new Event("change", { bubbles: true })
        );
    };

    const updateValue = (newValue: string[]) => {
        if (!isControlled) {
            setInternalValue(newValue);
        }
        syncSelectValue(newValue);
    };

    /* ===============================
       Toggle opciones
       =============================== */

    const toggleOption = (optionValue: string) => {
        const newValue = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue];

        updateValue(newValue);
    };

    const removeOption = (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateValue(selectedValues.filter(v => v !== optionValue));
    };

    /* ===============================
       Click fuera
       =============================== */

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node) && !labelRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    /* ===============================
       Resize observer
       =============================== */

    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const ro = new ResizeObserver(() => {
            setReloadValueContainer(true);
        });

        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [selectedValues]);

    useLayoutEffect(() => {
        if (reloadValueContainer) {
            setVisibleCount(selectedValues.length);
            setReloadValueContainer(false);
            return;
        }
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const children = [...container.children];

        const overflowingItems = children
            .map((child, index) => {
                const c = child.getBoundingClientRect();
                const overflowX = c.right > rect.right || c.left < rect.left;
                const isPlusSign = child.id === "plusSign";
                const distanceToEnd = rect.right - c.right;

                if (overflowX) {
                    return {
                        child,
                        index,
                        width: c.width,
                        overflowX,
                        isPlusSign,
                        distanceToEnd,
                    };
                }

                return null; // Retornar null para los elementos que no tengan overflow
            })
            .filter(item => item !== null); // Eliminar los nulls
        if (overflowingItems.length > 0) {
            setVisibleCount(Math.max(0, visibleCount - overflowingItems.length));
        }

    }, [reloadValueContainer, visibleCount]);

    const multiselectElement = (
        <>
            {/* SELECT NATIVO REAL */}
            <select
                ref={selectRef}
                name={name}
                multiple
                className="hidden"
                defaultValue={selectedValues}
                {...selectProps}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            <div className={`relative`} ref={multiSelectRef}>
                <span
                    className={twMerge(`w-full border rounded pl-3 pr-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center cursor-pointer gap-1 font-normal ${className}`)}
                    onClick={() => {
                        setIsOpen(!isOpen);
                    }}
                >
                    <span className={`w-full justify-start text-gray-400 text-ellipsis truncate flex gap-1 select-none`}>
                        {selectedValues.length > 0 ? (
                            <>
                                <span id="!1" ref={containerRef} className="w-full flex justify-start gap-1 ">
                                    {selectedValues.slice(0, visibleCount).map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-1 py-1 rounded whitespace-nowrap flex-shrink-0  truncate gap-0.5"
                                        >
                                            {options.find((opt) => opt.value === item)?.label || item}
                                            <ButtonComponent
                                                type="button"
                                                variant="base"
                                                onClick={(e) => removeOption(item, e)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        removeOption(item, e as any);
                                                    }
                                                }}
                                                className="p-0 px-0 py-0"
                                            >
                                                X
                                            </ButtonComponent>
                                        </span>
                                    ))}
                                    {visibleCount == 0 &&
                                        <span className="inline-flex items-center bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex-shrink-0">
                                            {selectedValues.length} seleccionado{selectedValues.length > 1 ? "s" : ""}
                                        </span>
                                    }
                                    {visibleCount > 0 && visibleCount < selectedValues.length &&
                                        <span id="plusSign" className="inline-flex items-center bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex-shrink-0 select-none">
                                            + {selectedValues.length - visibleCount}
                                        </span>
                                    }
                                </span>
                            </>
                        ) : (
                            placeholder
                        )}

                    </span>
                    <span
                        className={`w-5 text-gray-400 transition-transform duration-100 ease-in-out ${isOpen ? "transform rotate-180" : ""}`}
                    >
                        ▼
                    </span>
                </span>
                <div
                    ref={dropdownRef}
                    style={{ maxWidth: `${multiSelectRef.current?.clientWidth}px` }}
                    className={`${isOpen ? "flex" : "hidden"} fixed z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 flex-col gap-2`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget)
                            e.preventDefault();
                    }}
                >
                    <input
                        name={`${label}-search`}
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="box-border w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <ul className="max-h-60 overflow-y-auto">
                        {
                            filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <li key={option.value}>
                                        <CheckboxComponent
                                            label={option.label}
                                            variant="left"
                                            checked={selectedValues.includes(option.value)}
                                            onChange={() => toggleOption(option.value)}
                                        />
                                    </li>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                    No se encontraron resultados
                                </div>
                            )}
                    </ul>
                </div>
            </div>
        </>
    );

    if (!label) return multiselectElement;

    return (
        <LabelComponent label={label} required={required} ref={labelRef}
            onClick={(e) => {
                if (e.target instanceof HTMLElement && dropdownRef.current?.contains(e.target)) return;
                e.preventDefault();
                setIsOpen(!isOpen);
            }}
        >
            {multiselectElement}
        </LabelComponent>
    );
}
