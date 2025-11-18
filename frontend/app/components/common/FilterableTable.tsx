import { useMemo } from "react";
import { DataTable } from "./DataTable";
import type { TableColumn } from "./DataTable";
import { FiltersSection } from "./FiltersSection";
import { Pagination } from "./Pagination";
import { InputComponent } from "./forms/InputComponent";
import type {
    ColumnFilter,
    FilterValues,
} from "./types/tableTypes";
import type { PagedInfo } from "~/types/apiType";


export interface FilterableColumn<T = any> extends TableColumn<T> {
    filter?: ColumnFilter;
}

export interface FilterableTableProps<T> {
    data: T[];
    columns: FilterableColumn<T>[];
    keyField: keyof T;
    searchPlaceholder?: string;
    itemName?: string;
    emptyMessage?: string;
    className?: string;
    onRowClick?: (item: T) => void;

    enableSearch?: boolean;
    searchTerm?: string;
    onSearchChange?: (search: string) => void;

    enableFilters?: boolean;
    filters?: FilterValues;
    onFiltersChange?: (filters: FilterValues) => void;

    enablePagination?: boolean;
    pageInfo?: PagedInfo;
    onPageChange?: (page: number) => void;

    isLoading?: boolean;
}

export type {
    ColumnFilter,
    FilterOption,
    FilterValues,
} from "./types/tableTypes";

export function FilterableTable<T>({
    data,
    columns,
    keyField,
    searchPlaceholder = "Buscar...",
    itemName = "elementos",
    emptyMessage = "No se encontraron resultados",
    className = "",
    onRowClick,
    enableSearch = true,
    searchTerm,
    onSearchChange,
    enableFilters = true,
    filters,
    onFiltersChange,
    enablePagination = true,
    pageInfo,
    onPageChange,
    isLoading = false,
}: FilterableTableProps<T>) {
    const filterFields = useMemo(() => {
        return columns
            .filter((col) => col.filter?.enabled)
            .map((col) => ({
                key: col.key,
                label: col.header,
                type: col.filter?.type || "text",
                placeholder: col.filter?.placeholder,
                options: col.filter?.options,
            }));
    }, [columns]);

    const enhancedColumns = useMemo(() => {
        if (!onRowClick) return columns;
        return columns.map((col) => ({
            ...col,
            className: `${col.className || ""} cursor-pointer hover:bg-gray-50`,
        }));
    }, [columns, onRowClick]);

    return (
        <div className={className}>
            {/* Search Bar */}
            {enableSearch && onSearchChange && (
                <div className="mb-4">
                    <InputComponent
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm || ""}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="max-w-md"
                    />
                </div>
            )}

            {/* Filters Section */}
            {enableFilters &&
                filterFields.length > 0 &&
                filters &&
                onFiltersChange && (
                    <FiltersSection
                        filters={filters}
                        fields={filterFields}
                        onFiltersChange={onFiltersChange}
                    />
                )}

            {/* Loading Spinner */}
            {isLoading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="loader" /> {/* Replace with your spinner component */}
                </div>
            ) : data.length > 0 ? (
                <DataTable
                    data={data}
                    columns={enhancedColumns}
                    keyField={keyField}
                    onRowClick={onRowClick}
                />
            ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    {emptyMessage}
                </div>
            )}

            {/* Pagination */}
            {enablePagination && pageInfo && onPageChange && (
                <Pagination
                    page={pageInfo.page}
                    totalPages={pageInfo.totalPages}
                    totalElements={pageInfo.totalElements}
                    size={pageInfo.size}
                    onPageChange={onPageChange}
                    itemName={itemName}
                />
            )}
        </div>
    );
}
