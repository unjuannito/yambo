import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  message,
  onRetry,
  className = "",
}: ErrorMessageProps) {
  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl ${className}`}
    >
      <div className="flex items-start gap-3">
        <FontAwesomeIcon
          icon={faCircleXmark}
          className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400"
        />
        <div className="flex-1">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-semibold text-red-600 hover:text-red-800 underline hover:no-underline transition-colors"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
