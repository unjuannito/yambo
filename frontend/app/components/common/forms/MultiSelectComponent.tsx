import {
    useState,
    useRef,
    useEffect,
    useId,
    useCallback,
    useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";

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

    const dropdownRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLLabelElement>(null);
    const multiSelectRef = useRef<HTMLDivElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const triggerRef = useRef<HTMLSpanElement>(null);
    const inputId = useId();

    const [maxVisibleTags, setMaxVisibleTags] = useState(3);

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
       Dropdown position (portal)
       =============================== */

    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const updateDropdownPosition = useCallback(() => {
        if (!multiSelectRef.current) return;
        const rect = multiSelectRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const maxDropdownHeight = 320;
        const openAbove = spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow;

        const availableHeight = Math.min(maxDropdownHeight, openAbove ? spaceAbove - 8 : spaceBelow - 8);

        setDropdownStyle({
            position: "fixed",
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
            maxHeight: availableHeight,
            ...(openAbove
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updateDropdownPosition();

        const handleScrollOrResize = () => updateDropdownPosition();
        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen, updateDropdownPosition]);

    /* ===============================
       Calculate visible tags from width
       =============================== */

    useLayoutEffect(() => {
        const el = triggerRef.current;
        if (!el) return;

        const compute = () => {
            const availableWidth = el.getBoundingClientRect().width - 40; // arrow + padding
            const avgTagWidth = 130; // approximate px per tag
            const plusBadgeWidth = 70;
            const fitCount = Math.max(1, Math.floor((availableWidth - plusBadgeWidth) / avgTagWidth));
            setMaxVisibleTags(
                selectedValues.length <= fitCount + 1 ? selectedValues.length : fitCount
            );
        };

        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => ro.disconnect();
    }, [selectedValues]);

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

            <div className="relative" ref={multiSelectRef}>
                <span
                    ref={triggerRef}
                    className={twMerge(`w-full border rounded pl-3 pr-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center cursor-pointer gap-1 font-normal ${className}`)}
                    onClick={() => {
                        setIsOpen(!isOpen);
                    }}
                >
                    <span className="w-full justify-start text-gray-400 text-ellipsis truncate flex gap-1 select-none overflow-hidden">
                        {selectedValues.length > 0 ? (
                            <span className="w-full flex justify-start gap-1 overflow-hidden">
                                {selectedValues.slice(0, maxVisibleTags).map((item) => (
                                    <span
                                        key={item}
                                        className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 gap-0.5"
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
                                {selectedValues.length > maxVisibleTags && (
                                    <span className="inline-flex items-center bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded flex-shrink-0 select-none">
                                        +{selectedValues.length - maxVisibleTags} más
                                    </span>
                                )}
                            </span>
                        ) : (
                            placeholder
                        )}

                    </span>
                    <span
                        className={`w-5 text-gray-400 transition-transform duration-100 ease-in-out select-none ${isOpen ? "transform rotate-180" : ""}`}
                    >
                        ▼
                    </span>
                </span>
                {isOpen && createPortal(
                    <div
                        ref={dropdownRef}
                        style={dropdownStyle}
                        className="bg-white border border-gray-300 rounded-md shadow-lg p-2 flex flex-col gap-2"
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
                        autoFocus={isOpen}
                        className="box-border w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shrink-0"
                    />

                    <ul className="overflow-y-auto" style={{ maxHeight: (dropdownStyle.maxHeight as number ?? 320) - 56 }}>
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
                    </div>,
                    document.body
                )}
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
