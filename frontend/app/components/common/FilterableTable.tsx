import { useMemo, useState, useCallback, useEffect } from "react";
import { DataTable } from "./DataTable";
import type { TableColumn } from "./DataTable";
import { FiltersSection } from "./FiltersSection";
import { Pagination } from "./Pagination";
import type { ColumnFilter, FilterValues } from "./types/tableTypes";
import type { PagedInfo, PagedResponse } from "~/types/apiType";
import { LoadingSpinner } from "./LoadingSpinner";
import { twMerge } from "tailwind-merge";

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

export type ViewMode = 'table' | 'grid';

export interface DisplayConfig<T> {
    type?: ViewMode;
    emptyMessage?: string;
    loadingMessage?: string;
    renderItem?: (item: T) => React.ReactNode;
    gridClassName?: string;
    onRowClick?: (item: T) => void;
}

export interface FeaturesConfig {
    enableFilters?: boolean;
    enablePagination?: boolean;
}

export interface FilterableTableProps<T> {
    columns: FilterableColumn<T>[];
    keyField: keyof T;
    className?: string;
    display?: DisplayConfig<T>;
    features?: FeaturesConfig;
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
    className = "",
    display = {},
    features = {},
    serverSide,
    data: clientData,
}: FilterableTableProps<T>) {
    const {
        type: viewMode = 'table',
        emptyMessage = "No se encontraron resultados",
        loadingMessage = "Cargando datos...",
        renderItem: renderGridItem,
        gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        onRowClick,
    } = display;

    const {
        enableFilters = true,
        enablePagination = true,
    } = features;

    const isServerSide = Boolean(serverSide);
    const isGridMode = viewMode === 'grid';

    // Validate grid mode requirements
    if (isGridMode && !renderGridItem) {
        throw new Error('renderGridItem is required when viewMode is "grid"');
    }

    // Server-side state
    const [serverData, setServerData] = useState<T[]>([]);
    const [pageInfo, setPageInfo] = useState<PagedInfo>({
        number: serverSide?.initialPage ?? 0,
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
    const [clientFilters, setClientFilters] = useState<FilterValues>(EMPTY_FILTERS);
    const clientPageSize = 10;

    // Server-side fetch
    const executeFetch = useCallback(async () => {
        if (!serverSide?.fetchData) return;

        setIsLoading(true);
        setError(null);
        try {
            const result = await serverSide.fetchData({
                page: pageInfo.number,
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
    }, [serverSide?.fetchData, pageInfo.number, pageInfo.size, filters]);

    useEffect(() => {
        if (isServerSide) {
            void executeFetch();
        }
    }, [executeFetch, isServerSide]);

    const handlePageChange = useCallback(
        (page: number) => {
            if (isServerSide) {
                setPageInfo((prev) => ({ ...prev, number: page }));
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
        if (isGridMode || !onRowClick) return columns;
        return columns.map((col) => ({
            ...col,
            className: twMerge(`cursor-pointer hover:bg-gray-50 ${col.className || ""}`),
        }));
    }, [columns, onRowClick, isGridMode]);

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
              number: clientPage,
              size: clientPageSize,
              totalElements: filteredData.length,
              totalPages: Math.ceil(filteredData.length / clientPageSize) || 1,
          };

    const activeFilters = isServerSide ? filters : clientFilters;

    // Render content based on view mode
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message={loadingMessage} size="md" />;
        }

        if (paginatedData.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-gray-500">{emptyMessage}</p>
                </div>
            );
        }

        if (isGridMode && renderGridItem) {
            return (
                <>
                    <div className={gridClassName}>
                        {paginatedData.map((item) => (
                            <div
                                key={String(item[keyField])}
                                onClick={() => onRowClick?.(item)}
                                className={onRowClick ? "cursor-pointer" : ""}
                            >
                                {renderGridItem(item)}
                            </div>
                        ))}
                    </div>
                    {enablePagination && (
                        <Pagination
                            page={displayPageInfo.number}
                            totalPages={displayPageInfo.totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            );
        }

        return (
            <>
                <DataTable
                    data={paginatedData}
                    columns={enhancedColumns}
                    keyField={keyField}
                    onRowClick={onRowClick}
                />
                {enablePagination && (
                    <Pagination
                        page={displayPageInfo.number}
                        totalPages={displayPageInfo.totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </>
        );
    };

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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Content */}
            {renderContent()}
        </div>
    );
}
