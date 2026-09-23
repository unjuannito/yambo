import { useTranslation } from "react-i18next";
import type { Product } from "~/services/productService";
import SelectComponent from "./SelectComponent";
import InputComponent from "./InputComponent";
import CheckboxComponent from "./CheckboxComponent";

export interface ProductOptionsFieldsProps {
    /** Producto cuyas opciones se renderizan. */
    product: Product;
    /** Configuración actual (objeto clave → valor). */
    configuration: Record<string, any>;
    /** Callback invocado con la nueva configuración al cambiar cualquier opción. */
    onChange: (next: Record<string, any>) => void;
    disabled?: boolean;
    /** Número de columnas del grid (por defecto 1). */
    columns?: 1 | 2;
}

/**
 * Renderiza los campos de configuración de un producto a partir de `product.options`
 * (select / checkbox / text_input), sin exponer el JSON subyacente.
 * Fuente única para la página de producto y el editor de pedidos.
 */
export default function ProductOptionsFields({
    product,
    configuration,
    onChange,
    disabled,
    columns = 1,
}: ProductOptionsFieldsProps) {
    const { t } = useTranslation();

    const options = product.options ?? [];
    if (options.length === 0) {
        return <p className="text-xs text-gray-400">{t("orders.editor.noOptions")}</p>;
    }

    const handleSelectChange = (optionName: string, value: string) => {
        const option = options.find((o) => o.name === optionName);
        const selected = option?.values?.find((v) => v.id === value);
        onChange({
            ...configuration,
            [optionName]: selected ? { id: value, label: selected.label } : value,
        });
    };

    const handleCheckboxChange = (optionName: string, checked: boolean) => {
        onChange({ ...configuration, [optionName]: checked });
    };

    const handleTextChange = (optionName: string, value: string) => {
        const trimmedValue = value.trim();
        onChange({ ...configuration, [optionName]: trimmedValue === "" ? "" : value });
    };

    return (
        <div className={columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
            {options.map((option) => {
                switch (option.type) {
                    case "select": {
                        const selectedValue = configuration[option.name];
                        const selectValue =
                            selectedValue && typeof selectedValue === "object" && selectedValue !== null
                                ? selectedValue.id
                                : selectedValue || "";
                        return (
                            <SelectComponent
                                key={option.name}
                                label={option.name}
                                required={option.required}
                                disabled={disabled}
                                value={selectValue}
                                onChange={(e) => handleSelectChange(option.name, e.target.value)}
                                options={[
                                    { value: "", label: t("merch.selectOption", { name: option.name }) },
                                    ...(option.values?.map((value) => ({
                                        value: value.id,
                                        label: `${value.label}${value.price ? ` (+${value.price}€)` : ""}`,
                                    })) || []),
                                ]}
                            />
                        );
                    }
                    case "checkbox":
                        return (
                            <CheckboxComponent
                                key={option.name}
                                label={option.name}
                                checked={configuration[option.name] || false}
                                disabled={disabled}
                                onChange={(e) => handleCheckboxChange(option.name, e.target.checked)}
                                required={option.required}
                            />
                        );
                    case "text_input":
                        return (
                            <InputComponent
                                key={option.name}
                                label={`${option.name}${option.price && option.price > 0 ? ` (+${option.price}€)` : ""}`}
                                type="text"
                                value={configuration[option.name] || ""}
                                disabled={disabled}
                                onChange={(e) => handleTextChange(option.name, e.target.value)}
                                placeholder={t("merch.textInputPlaceholder", { name: option.name })}
                                required={option.required}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
}
