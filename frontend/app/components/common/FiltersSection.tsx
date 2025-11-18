import { InputComponent } from "~/components/common/forms/InputComponent";
import { SelectComponent } from "~/components/common/forms/SelectComponent";
import { MultiSelectComponent } from "~/components/common/forms/MultiSelectComponent";
import type { FilterField, FilterValues } from "./types/tableTypes";

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
    title = "Filtros"
}: FiltersSectionProps) {
    const updateFilter = (key: string, value: string | boolean | undefined | string[]) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const renderField = (field: FiltersSectionProps['fields'][0]) => {
        const value = filters[field.key];

        switch (field.type) {
            case 'text':
                return (
                    <InputComponent
                        key={field.key}
                        label={field.label}
                        placeholder={field.placeholder || field.label}
                        value={value || ''}
                        onChange={(e) => updateFilter(field.key, e.target.value)}
                    />
                );
            case 'select':
                return (
                    <SelectComponent
                        key={field.key}
                        label={field.label}
                        value={value === undefined ? '' : String(value)}
                        onChange={(e) => updateFilter(field.key, e.target.value === '' ? undefined : e.target.value)}
                        options={field.options}
                    />
                );
            case 'multi-select':
                return (
                    <MultiSelectComponent
                        key={field.key}
                        label={field.label}
                        value={Array.isArray(value) ? value : []}
                        options={field.options || []}
                        placeholder={field.placeholder || `Seleccionar ${field.label.toLowerCase()}`}
                        onChange={(newValue) => updateFilter(field.key, newValue)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {fields.map(renderField)}
            </div>
        </div>
    );
}