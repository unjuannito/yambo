import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { DataTable } from "./DataTable";
import type { TableColumn } from "./DataTable";
import { FiltersSection } from "./FiltersSection";
import { Pagination } from "./Pagination";
import type { ColumnFilter, FilterValues } from "./types/tableTypes";
import type { PagedInfo, PagedResponse } from "~/types/apiType";
import { LoadingSpinner } from "./LoadingSpinner";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";

export interface FilterableColumn<T = any> extends TableColumn<T> {
    filter?: ColumnFilter;
}

export interface FetchDataParams {
    page: number;
    size: number;
    filters: FilterValues;
}

interface ServerSideProps<T> {
    fetchData: (params: FetchDataParams) => Promise<PagedResponse<T> | null>;
    initialPage?: number;
    initialSize?: number;
    initialFilters?: FilterValues;
}

export interface FilterableTableProps<T> {
    columns: FilterableColumn<T>[];
    keyField: keyof T;
    emptyMessage?: string;
    className?: string;
    onRowClick?: (item: T) => void;
    enableFilters?: boolean;
    enablePagination?: boolean;

    serverSide?: ServerSideProps<T>;

    data?: T[];
}

export type {
    ColumnFilter,
    FilterOption,
    FilterValues,
} from "./types/tableTypes";

const EMPTY_FILTERS: FilterValues = {};

export function FilterableTable<T>({
    columns,
    keyField,
    emptyMessage = "No se encontraron resultados",
    className = "",
    onRowClick,
    enableFilters = true,
    enablePagination = true,
    serverSide,
    data: clientData,
}: FilterableTableProps<T>) {
    const isServerSide = Boolean(serverSide);

    // Server-side state
    const [serverData, setServerData] = useState<T[]>([]);
    const [pageInfo, setPageInfo] = useState<PagedInfo>({
        page: serverSide?.initialPage ?? 0,
        size: serverSide?.initialSize ?? 10,
        totalElements: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState<FilterValues>(
        serverSide?.initialFilters ?? EMPTY_FILTERS
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Client-side state
    const [clientPage, setClientPage] = useState(0);
    const [clientFilters, setClientFilters] =
        useState<FilterValues>(EMPTY_FILTERS);
    const clientPageSize = 10;

    // Refs for stable callbacks
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    // Server-side fetch
    const executeFetch = useCallback(async () => {
        if (!serverSide?.fetchData) return;

        setIsLoading(true);
        setError(null);
        try {
            const result = await serverSide.fetchData({
                page: pageInfo.page,
                size: pageInfo.size,
                filters,
            });
            if (result) {
                setServerData(result.content);
                setPageInfo(result.page);
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Error al cargar los datos";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [serverSide?.fetchData, pageInfo.page, pageInfo.size, filters]);

    useEffect(() => {
        if (isServerSide) {
            void executeFetch();
        }
    }, [executeFetch, isServerSide]);

    const handlePageChange = useCallback(
        (page: number) => {
            if (isServerSide) {
                setPageInfo((prev) => ({ ...prev, page }));
            } else {
                setClientPage(page);
            }
        },
        [isServerSide]
    );

    const handleFiltersChange = useCallback(
        (newFilters: FilterValues) => {
            if (isServerSide) {
                setFilters(newFilters);
                setPageInfo((prev) => ({ ...prev, page: 0 }));
            } else {
                setClientFilters(newFilters);
                setClientPage(0);
            }
        },
        [isServerSide]
    );

    // Derived data
    const data = isServerSide ? serverData : (clientData ?? []);

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
            className: twMerge(`cursor-pointer hover:bg-gray-50 ${col.className || ""}`),
        }));
    }, [columns, onRowClick]);

    // Client-side filtering
    const filteredData = useMemo(() => {
        if (isServerSide) return data;

        let result = [...data];

        // Column filters
        if (enableFilters) {
            Object.entries(clientFilters).forEach(([key, value]) => {
                if (value === undefined || value === "" || value === null)
                    return;

                if (Array.isArray(value)) {
                    if (value.length === 0) return;
                    result = result.filter((item) => {
                        const itemValue = item[key as keyof T];
                        if (Array.isArray(itemValue)) {
                            return itemValue.some((obj: any) => {
                                const idValue = obj?.id ?? obj;
                                return value.includes(String(idValue));
                            });
                        }
                        return value.includes(String(itemValue));
                    });
                } else {
                    const lowered = String(value).toLowerCase();
                    result = result.filter((item) => {
                        const itemValue = item[key as keyof T];
                        return String(itemValue ?? "")
                            .toLowerCase()
                            .includes(lowered);
                    });
                }
            });
        }

        return result;
    }, [data, clientFilters, columns, enableFilters, isServerSide]);

    // Client-side pagination
    const paginatedData = useMemo(() => {
        if (isServerSide) return data;
        if (!enablePagination) return filteredData;
        const startIndex = clientPage * clientPageSize;
        return filteredData.slice(startIndex, startIndex + clientPageSize);
    }, [
        filteredData,
        clientPage,
        clientPageSize,
        enablePagination,
        isServerSide,
        data,
    ]);

    // Pagination info
    const displayPageInfo: PagedInfo = isServerSide
        ? pageInfo
        : {
              page: clientPage,
              size: clientPageSize,
              totalElements: filteredData.length,
              totalPages: Math.ceil(filteredData.length / clientPageSize) || 1,
          };

    const activeFilters = isServerSide ? filters : clientFilters;

    return (
        <div className={twMerge(`flex flex-col gap-4 ${className}`)}>
            {/* Filters Section */}
            {enableFilters && filterFields.length > 0 && (
                <FiltersSection
                    filters={activeFilters}
                    fields={filterFields}
                    onFiltersChange={handleFiltersChange}
                />
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Loading / Table / Empty */}
            {isLoading ? (
                <LoadingSpinner message="Cargando datos..." size="md" />
            ) : paginatedData.length > 0 ? (
                <>
                    <DataTable
                        data={paginatedData}
                        columns={enhancedColumns}
                        keyField={keyField}
                        onRowClick={onRowClick}
                    />
                    {/* Pagination */}
                    {enablePagination && (
                        <Pagination
                            page={displayPageInfo.page}
                            totalPages={displayPageInfo.totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            ) : (
                <span className="text-center text-gray-500">
                    {emptyMessage}
                </span>
            )}
        </div>
    );
}
