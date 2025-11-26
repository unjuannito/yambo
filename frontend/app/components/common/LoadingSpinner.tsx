interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    message?: string;
}

const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
};

export function LoadingSpinner({
    size = "md",
    message
}: LoadingSpinnerProps) {

    return (<div className="flex flex-col items-center justify-center gap-3">
            <svg
                className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
                role="status"
                aria-label="Cargando"
            />
            {message && <p className="text-gray-600 text-sm">{message}</p>}
        </div>);
}
