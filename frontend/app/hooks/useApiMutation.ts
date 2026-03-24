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

                if (successMessage) {
                    const message =
                        typeof successMessage === "function"
                            ? successMessage(result, variables)
                            : successMessage;
                    toast.success(message);
                }

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

                let toastMessage: string;
                let toastDuration = 4000;

                if (errorMessage) {
                    toastMessage =
                        typeof errorMessage === "function"
                            ? errorMessage(
                                  apiError ?? new Error(errorMsg),
                                  variables,
                              )
                            : errorMessage;
                } else if (apiError?.isValidationError() && apiError.details) {
                    toastMessage = `Error de validación:\n${apiError.details}`;
                    toastDuration = 6000;
                } else if (apiError?.isForbiddenError()) {
                    toastMessage = "¡Acceso denegado! No tienes permisos para esto";
                } else if (apiError?.isServerError()) {
                    toastMessage = "Nuestro servidor necesita un respiro. Vuelve en un ratito";
                    toastDuration = 5000;
                } else {
                    toastMessage = errorMsg;
                }

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
