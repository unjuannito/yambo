import InputComponent from "~/components/common/forms/InputComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import LabelComponent from "~/components/common/forms/LabelComponent";
import type { FilterField, FilterValues } from "./types/tableTypes";
import CheckboxComponent from "./forms/CheckboxComponent";
import { DateRangePicker } from "./DateRangePicker";

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
  const lgCols: 1 | 2 | 3 | 4 =
    fields.length >= 4 ? 4 : (fields.length as 1 | 2 | 3);

  const mdClassMap = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
  } as const;

  const lgClassMap = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  } as const;

  const updateFilter = (
    key: string,
    value:
      | string
      | boolean
      | undefined
      | string[]
      | { startDate: string; endDate: string }
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const renderField = (field: FiltersSectionProps["fields"][0]) => {
    const value = filters[field.key];

    switch (field.type) {
      case "search":
        return (
          <LabelComponent
            key={field.key}
            label={field.label}
            className="col-span-1"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                id={`filter-${field.key}`}
                type="search"
                value={value || ""}
                onChange={(e) =>
                  updateFilter(field.key, e.target.value)
                }
                placeholder={
                  field.placeholder ||
                  `Buscar ${field.label.toLowerCase()}...`
                }
                className="block w-full pl-10 pr-3 text-sm py-2 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 transition-all duration-200"
                aria-label={field.label}
              />
            </div>
          </LabelComponent>
        );
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
                e.target.value === "" ? undefined : e.target.value
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
              field.placeholder ??
              `Seleccionar ${field.label.toLowerCase()}`
            }
            onChange={(e) => {
              const selectedValues = Array.from(
                e.currentTarget.selectedOptions
              ).map((option) => option.value);
              updateFilter(
                field.key,
                selectedValues.length > 0 ? selectedValues : undefined
              );
            }}
            className="col-span-1"
          />
        );
      case "checkbox":
        return (
          <CheckboxComponent
            key={field.key}
            label={field.label}
            value={value || ""}
            variant="right-with-description"
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
            variantType="toggle"
            variant="right-with-description"
            checked={Boolean(value)}
            onChange={(e) =>
              updateFilter(field.key, e.target.checked)
            }
            className="col-span-1"
          />
        );
      case "date-range":
        return (
          <DateRangePicker
            key={field.key}
            label={field.label}
            startDate={value?.startDate || ""}
            endDate={value?.endDate || ""}
            onChange={(range) => {
              const hasValue = range.startDate || range.endDate;
              updateFilter(field.key, hasValue ? range : undefined);
            }}
            className="col-span-1"
          />
        );
      default:
        return null;
    }
  };

  return (
    <form
      className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-flow-row auto-rows-auto grid-cols-1 ${mdClassMap[mdCols]} ${lgClassMap[lgCols]} gap-4`}
    >
      {title && (
        <h2 className="text-xl font-bold font-display col-span-full">
          {title}
        </h2>
      )}
      {fields.map(renderField)}
    </form>
  );
}
