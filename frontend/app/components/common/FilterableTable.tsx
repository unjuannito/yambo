import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { DataTable } from "./DataTable";
import type { TableColumn } from "./DataTable";
import { FiltersSection } from "./FiltersSection";
import { Pagination } from "./Pagination";
import type { ColumnFilter, FilterValues } from "./types/tableTypes";
import type { PagedInfo, PagedResponse } from "~/types/apiType";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";
import { getErrorMessage } from "~/types/error";
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
    enableLoadMore?: boolean;
    loadMoreLabel?: string;
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
        enableLoadMore = false,
        loadMoreLabel = "Cargar más",
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
    const skipNextFetchRef = useRef(false);

    // Client-side state
    const [clientPage, setClientPage] = useState(0);
    const [clientFilters, setClientFilters] = useState<FilterValues>(EMPTY_FILTERS);
    const clientPageSize = 10;

    // Server-side fetch
    const executeFetch = useCallback(async () => {
        if (!serverSide?.fetchData) return;
        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            return;
        }

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
            const errorMessage = getErrorMessage(err, "Error al cargar los datos");
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

    const handleLoadMore = useCallback(async () => {
        if (isServerSide) {
            if (!serverSide?.fetchData) return;
            if (isLoading) return;
            const nextPage = pageInfo.number + 1;
            if (nextPage >= pageInfo.totalPages) return;

            setIsLoading(true);
            setError(null);
            try {
                const result = await serverSide.fetchData({
                    page: nextPage,
                    size: pageInfo.size,
                    filters,
                });
                if (result) {
                    setServerData((prev) => [...prev, ...result.content]);
                    skipNextFetchRef.current = true;
                    setPageInfo(result.page);
                }
            } catch (err) {
                const errorMessage = getErrorMessage(err, "Error al cargar los datos");
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        } else {
            setClientPage((prev) => prev + 1);
        }
    }, [
        filters,
        isLoading,
        isServerSide,
        pageInfo.number,
        pageInfo.size,
        pageInfo.totalPages,
        serverSide?.fetchData,
    ]);

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
                label: typeof col.header === "string" ? col.header : "",
                type: col.filter?.type || "text",
                placeholder: col.filter?.placeholder,
                options: col.filter?.options,
            }));
    }, [columns]);

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
        if (enableLoadMore) {
            return filteredData.slice(0, (clientPage + 1) * clientPageSize);
        }
        const startIndex = clientPage * clientPageSize;
        return filteredData.slice(startIndex, startIndex + clientPageSize);
    }, [
        filteredData,
        clientPage,
        clientPageSize,
        enablePagination,
        enableLoadMore,
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

        const canLoadMore =
            enableLoadMore &&
            displayPageInfo.number + 1 < displayPageInfo.totalPages;

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
                    {canLoadMore && (
                        <div className="flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                {isLoading ? loadingMessage : loadMoreLabel}
                            </button>
                        </div>
                    )}
                </>
            );
        }

        return (
            <>
                <DataTable
                    data={paginatedData}
                    columns={columns}
                    keyField={keyField}
                    onRowClick={onRowClick}
                />
                {enablePagination && !enableLoadMore && (
                    <Pagination
                        page={displayPageInfo.number}
                        totalPages={displayPageInfo.totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
                {canLoadMore && (
                    <div className="flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            {isLoading ? loadingMessage : loadMoreLabel}
                        </button>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className={twMerge(`flex flex-col gap-4 min-w-0 ${className}`)}>
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
                <ErrorMessage message={error} onRetry={isServerSide ? executeFetch : undefined} />
            )}

            {/* Content */}
            {renderContent()}
        </div>
    );
}
