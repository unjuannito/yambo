import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { ApiError, getErrorMessage } from "~/types/error";

interface UseApiMutationOptions<TData, TVariables> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: ApiError | Error, variables: TVariables) => void;
    successMessage?: string | ((data: TData, variables: TVariables) => string);
    errorMessage?:
        | string
        | ((error: ApiError | Error, variables: TVariables) => string);
}

interface UseApiMutationResult<TData, TVariables> {
    mutate: (variables: TVariables) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    data: TData | null;
    reset: () => void;
}

function invokeSuccessMessage<TData, TVariables>(
    successMessage: string | ((data: TData, variables: TVariables) => string) | undefined,
    result: TData,
    variables: TVariables,
): void {
    if (!successMessage) return;
    const message =
        typeof successMessage === "function"
            ? successMessage(result, variables)
            : successMessage;
    toast.success(message);
}

function resolveToastMessage<TData, TVariables>(
    err: unknown,
    errorMessage: string | ((error: ApiError | Error, variables: TVariables) => string) | undefined,
    variables: TVariables,
): { message: string; duration: number } {
    const apiError = err instanceof ApiError ? err : null;
    const errorMsg = getErrorMessage(err, "¡Algo salió mal!");

    if (errorMessage) {
        return {
            message:
                typeof errorMessage === "function"
                    ? errorMessage(apiError ?? new Error(errorMsg), variables)
                    : errorMessage,
            duration: 4000,
        };
    }

    if (apiError?.isValidationError() && apiError.details) {
        return {
            message: `Error de validación:\n${apiError.details}`,
            duration: 6000,
        };
    }

    if (apiError?.isForbiddenError()) {
        return {
            message: "¡Acceso denegado! No tienes permisos para esto",
            duration: 4000,
        };
    }

    if (apiError?.isServerError()) {
        return {
            message: "Nuestro servidor necesita un respiro. Vuelve en un ratito",
            duration: 5000,
        };
    }

    return { message: errorMsg, duration: 4000 };
}

/**
 * Hook for API mutations with loading states, error handling, and toast notifications
 * @param options Configuration object with mutation function and callbacks
 * @returns Object with mutate function and state
 */
export function useApiMutation<TData = any, TVariables = void>({
    mutationFn,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
}: UseApiMutationOptions<TData, TVariables>): UseApiMutationResult<
    TData,
    TVariables
> {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<TData | null>(null);

    const mutate = useCallback(
        async (variables: TVariables) => {
            try {
                setIsLoading(true);
                setError(null);

                const result = await mutationFn(variables);
                setData(result);

                invokeSuccessMessage(successMessage, result, variables);

                if (onSuccess) {
                    onSuccess(result, variables);
                }
            } catch (err) {
                const apiError = err instanceof ApiError ? err : null;

                const errorMsg = getErrorMessage(err, "¡Algo salió mal!");
                setError(errorMsg);

                // Token errors are handled globally by the interceptor (auto-logout)
                if (apiError?.isTokenError()) {
                    if (onError) {
                        onError(apiError, variables);
                    }
                    throw err;
                }

                const { message: toastMessage, duration: toastDuration } =
                    resolveToastMessage(err, errorMessage, variables);

                toast.error(toastMessage, { duration: toastDuration });

                if (onError) {
                    onError(
                        apiError ?? new Error(errorMsg),
                        variables,
                    );
                }

                throw err; // Re-throw to allow component-level handling if needed
            } finally {
                setIsLoading(false);
            }
        },
        [mutationFn, onSuccess, onError, successMessage, errorMessage]
    );

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        mutate,
        isLoading,
        error,
        data,
        reset,
    };
}
