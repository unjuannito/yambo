import { InputComponent } from "~/components/common/forms/InputComponent";
import { SelectComponent } from "~/components/common/forms/SelectComponent";
import { MultiSelectComponent } from "~/components/common/forms/MultiSelectComponent";
import type { FilterField, FilterValues } from "./types/tableTypes";
import { CheckboxComponent } from "./forms/CheckboxComponent";

export interface FiltersSectionProps {
    filters: FilterValues;
    fields: FilterField[];
    onFiltersChange: (filters: FilterValues) => void;
    title?: string;
}

export type { FilterField, FilterValues } from "./types/tableTypes";

export function FiltersSection({
    filters,
    fields,
    onFiltersChange,
    title,
}: FiltersSectionProps) {
    const mdCols: 1 | 2 = fields.length > 2 ? 2 : (fields.length as 1 | 2);
    const lgCols: 1 | 2 | 3 | 5 =
        fields.length >= 4 ? 5 : (fields.length as 1 | 2 | 3);

    const mdClassMap = {
        1: "md:grid-cols-1",
        2: "md:grid-cols-2",
    } as const;

    const lgClassMap = {
        1: "lg:grid-cols-1",
        2: "lg:grid-cols-2",
        3: "lg:grid-cols-3",
        5: "lg:grid-cols-5",
    } as const;

    const updateFilter = (
        key: string,
        value: string | boolean | undefined | string[]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const renderField = (field: FiltersSectionProps["fields"][0]) => {
        const value = filters[field.key];

        switch (field.type) {
            case "text":
                return (
                    <InputComponent
                        key={field.key}
                        label={field.label}
                        placeholder={field.placeholder || field.label}
                        value={value || ""}
                        onChange={(e) =>
                            updateFilter(field.key, e.target.value)
                        }
                        className="col-span-1"
                    />
                );
            case "select":
                return (
                    <SelectComponent
                        key={field.key}
                        label={field.label}
                        value={value === undefined ? "" : String(value)}
                        onChange={(e) =>
                            updateFilter(
                                field.key,
                                e.target.value === ""
                                    ? undefined
                                    : e.target.value
                            )
                        }
                        options={field.options}
                        className="col-span-1"
                    />
                );
            case "multi-select":
                return (
                    <MultiSelectComponent
                        key={field.key}
                        label={field.label}
                        value={Array.isArray(value) ? value : []}
                        options={field.options || []}
                        placeholder={
                            field.placeholder ||
                            `Seleccionar ${field.label.toLowerCase()}`
                        }
                        onChange={(newValue) =>
                            updateFilter(field.key, newValue)
                        }
                        className="col-span-1"
                    />
                );
            case "checkbox":
                return (
                    <CheckboxComponent
                        key={field.key}
                        label={field.label}
                        value={value || ""}
                        onChange={(e) =>
                            updateFilter(field.key, e.target.checked)
                        }
                        className="col-span-1"
                    />
                );
            case "toggle":
                return (
                    <CheckboxComponent
                        key={field.key}
                        label={field.label}
                        variant="toggle"
                        checked={Boolean(value)}
                        onChange={(e) =>
                            updateFilter(field.key, e.target.checked)
                        }
                        className="col-span-1"
                    />
                );
            default:
                return null;
        }
    };

    return (
        <form
            className={`bg-white p-4 rounded-lg shadow mb-6 grid grid-flow-row auto-rows-auto grid-cols-1 ${mdClassMap[mdCols]} ${lgClassMap[lgCols]} gap-4`}
        >
            {title && (
                <h2 className="text-xl font-semibold col-span-full">{title}</h2>
            )}
            {fields.map(renderField)}
        </form>
    );
}
