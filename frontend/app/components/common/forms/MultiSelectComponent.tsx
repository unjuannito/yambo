import { useState, useRef, useEffect, useId, useLayoutEffect } from "react";
import LabelComponent from "./LabelComponent";
import InputComponent from "./InputComponent";
import ButtonComponent from "./ButtonComponent";
import type { index } from "@react-router/dev/routes";
import CheckboxComponent from "./CheckboxComponent";

interface MultiSelectProps {
    label?: string;
    value?: string[];
    options?: { value: string; label: string }[];
    placeholder?: string;
    onChange?: (value: string[]) => void;
    className?: string;
    required?: boolean;
}

export default function MultiSelectComponent({
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
    const [visibleCount, setVisibleCount] = useState(value.length);
    const [containerWidth, setContainerWidth] = useState(value.length);
    const [reloadValueContainer, setReloadValueContainer] = useState<boolean>(false)
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLSpanElement>(null);
    const inputId = useId();

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    // Cerrar clic fuera
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!dropdownRef.current) return;

            const target = event.target as Node;

            // Obtener el label padre del dropdown (si existe)
            const parentLabel = dropdownRef.current.closest("label");

            // Si el click viene de ese mismo label → NO cerrar
            if (parentLabel && parentLabel.contains(target)) {
                return;
            }

            // Si haces clic fuera → cerrar
            if (!dropdownRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        document.removeEventListener("mousedown", handleClickOutside);
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

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

    //Pone a true el reloadValueContainer
    useLayoutEffect(() => {
        const handleResize = () => {
            setReloadValueContainer(true);
        };

        // Solo intentamos observar si el ref está disponible
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(containerRef.current); // Comienza a observar el contenedor

            // Limpiar el observer cuando el componente se desmonte
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [value]);

    //Establece cuantos values son visibles en el container
    useLayoutEffect(() => {
        if (reloadValueContainer === true) {
            setVisibleCount(value.length)
            setReloadValueContainer(false)
            return;
        }

        //ver si sobresale alguno
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

    }, [reloadValueContainer, visibleCount])

    const multiselectElement = (
        <>
            <div className={`relative`} ref={dropdownRef}>
                <span
                    className={`w-full border rounded pl-3 pr-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center cursor-pointer gap-1 font-normal ${className}`}
                    onClick={(e) => {
                        setIsOpen(!isOpen);
                    }}
                >
                    <span className={`w-full justify-start text-gray-400 text-ellipsis truncate flex gap-1 select-none`}>
                        {value.length > 0 ? (
                            <>
                                <span id="!1" ref={containerRef} className="w-full flex justify-start gap-1 ">
                                    {value.slice(0, visibleCount).map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-1 py-1 rounded whitespace-nowrap flex-shrink-0  truncate   "
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
                                            {value.length} seleccionado{value.length > 1 ? "s" : ""}
                                        </span>
                                    }
                                    {visibleCount > 0 && visibleCount < value.length &&
                                        <span id="plusSign" className="inline-flex items-center bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex-shrink-0 select-none">
                                            + {value.length - visibleCount}
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
                    className={`${isOpen ? "flex" : "hidden"} absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 flex-col gap-2`}
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
                                            checked={value.includes(option.value)}
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
            <select multiple value={value} className="hidden" aria-readonly onChange={() => { }}></select>
        </>
    );

    if (!label) {
        return multiselectElement;
    }

    return (
        <LabelComponent label={label} required={required}>
            {multiselectElement}
        </LabelComponent>
    );
}
