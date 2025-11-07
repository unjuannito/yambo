import { useState, useEffect, useCallback } from "react";
import { ApiError } from "~/types/error";

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

    const fetchData = useCallback(async () => {
        if (!enabled) return;
        
        try {
            setLoading(true);
            setError(null);
            const result = await fetchFn();
            setData(result);
        } catch (err: any) {
            const errorMessage = err instanceof ApiError 
                ? err.getUserMessage() 
                : err.message || 'Error al cargar datos';
            
            setError(errorMessage);
            
            if (err instanceof ApiError) {
                console.error('Fetch error:', err.getDebugInfo());
            } else {
                console.error('Fetch error:', err);
            }
            
            if (onError) {
                onError(err);
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
        refetch: fetchData,
    };
}
