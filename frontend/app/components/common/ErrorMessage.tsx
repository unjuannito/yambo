interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
    return (
        <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}>
            <div className="flex items-start gap-2">
                <svg 
                    className="w-5 h-5 flex-shrink-0 mt-0.5" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                >
                    <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                        clipRule="evenodd" 
                    />
                </svg>
                <div className="flex-1">
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{message}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-2 text-sm font-medium underline hover:no-underline"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
