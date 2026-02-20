import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
    return (
        <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}>
            <div className="flex items-start gap-2">
                <FontAwesomeIcon
                    icon={faCircleXmark}
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                />
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
