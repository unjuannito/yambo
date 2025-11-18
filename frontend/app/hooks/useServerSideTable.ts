import { useState, useCallback, useEffect } from "react";
import type { PagedInfo, PagedResponse } from "~/types/apiType";
import type { FilterValues } from "~/components/common/types/tableTypes";

interface ServerSideTableOptions {
    initialPage?: number;
    initialSize?: number;
    initialFilters?: FilterValues;
}

export interface FetchDataParams {
    page: number;
    size: number;
    filters: FilterValues;
}

export function useServerSideTable<T>(
    fetchData: (params: FetchDataParams) => Promise<PagedResponse<T> | null>,
    options: ServerSideTableOptions = {}
) {
    const {
        initialPage = 0,
        initialSize = 10,
        initialFilters = {},
    } = options;

    const [data, setData] = useState<T[]>([]);
    const [pageInfo, setPageInfo] = useState<PagedInfo>({
        page: initialPage,
        size: initialSize,
        totalElements: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState<FilterValues>(initialFilters);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeFetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await fetchData({
                page: pageInfo.page,
                size: pageInfo.size,
                filters,
            });
            if (result) {
                setData(result.content);
                setPageInfo(result.page);
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Error al cargar los datos";
            setError(errorMessage);
            console.error("Error fetching data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [fetchData, pageInfo.page, pageInfo.size, filters]);

    useEffect(() => {
        void executeFetch();
    }, [executeFetch]);

    const handlePageChange = useCallback((page: number) => {
        setPageInfo((prev) => ({ ...prev, page }));
    }, []);

    const handleFiltersChange = useCallback((newFilters: FilterValues) => {
        setFilters(newFilters);
        setPageInfo((prev) => ({ ...prev, page: 0 }));
    }, []);

    const retry = useCallback(() => {
        void executeFetch();
    }, [executeFetch]);

    return {
        data,
        pageInfo,
        filters,
        isLoading,
        error,
        handlePageChange,
        handleFiltersChange,
        retry,
    };
}
