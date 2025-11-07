import { Button } from "~/components/common/forms/Button";
import { Input } from "~/components/common/forms/Input";
import { Select } from "~/components/common/forms/Select";
import type { FiltersSectionProps } from "./types";

export function FiltersSection({
    filters,
    fields,
    onFiltersChange,
    onSearch,
    title = "Filtros"
}: FiltersSectionProps) {
    const updateFilter = (key: string, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const renderField = (field: FiltersSectionProps['fields'][0]) => {
        const value = filters[field.key];

        switch (field.type) {
            case 'text':
                return (
                    <Input
                        key={field.key}
                        placeholder={field.placeholder || field.label}
                        value={value || ''}
                        onChange={(e) => updateFilter(field.key, e.target.value)}
                    />
                );
            case 'select':
                return (
                    <Select
                        key={field.key}
                        value={value === undefined ? '' : String(value)}
                        onChange={(e) => updateFilter(field.key, e.target.value === '' ? undefined : e.target.value)}
                    >
                        {field.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
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
            <Button onClick={onSearch} className="mt-4">
                Buscar
            </Button>
        </div>
    );
}