import { useState, useEffect, useCallback } from "react";
import { ApiError, getErrorMessage } from "~/types/error";
interface UseDataFetchOptions<T> {
    fetchFn: () => Promise<T>;
    onError?: (error: ApiError | Error) => void;
    dependencies?: any[];
    enabled?: boolean;
}

interface UseDataFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    notFound: boolean;
    refetch: () => Promise<void>;
}

/**
 * Generic hook for fetching data with loading and error states
 * @param options Configuration object with fetch function and options
 * @returns Object with data, loading, error, and refetch function
 */
export function useDataFetch<T>({
    fetchFn,
    onError,
    dependencies = [],
    enabled = true,
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const fetchData = useCallback(async () => {
        if (!enabled) return;

        try {
            setLoading(true);
            setError(null);
            setNotFound(false);
            const result = await fetchFn();
            setData(result);
        } catch (err) {
            const errorMessage = getErrorMessage(err, "Error al cargar datos");

            if (err instanceof ApiError && err.isNotFoundError()) {
                setNotFound(true);
            }

            setError(errorMessage);

            if (onError) {
                onError(err instanceof ApiError ? err : err instanceof Error ? err : new Error(errorMessage));
            }
        } finally {
            setLoading(false);
        }
    }, [fetchFn, enabled, onError]);

    useEffect(() => {
        fetchData();
    }, [...dependencies, enabled]);

    return {
        data,
        loading,
        error,
        notFound,
        refetch: fetchData,
    };
}
