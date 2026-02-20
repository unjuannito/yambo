import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | "xl";
    message?: string;
}

const sizeClasses = {
    sm: {
        text: "text-sm",
        spinner: "h-4 w-4",
        gap: "gap-1"
    }
    ,
    md: {
        text: "text-md",
        spinner: "h-8 w-8",
        gap: "gap-2"
    },
    lg: {
        text: "text-lg",
        spinner: "h-16 w-16",
        gap: "gap-4"
    },
    xl:  {
        text: "text-xl",
        spinner: "h-32 w-32",
        gap: "gap-8"
    }
};
export function LoadingSpinner({
    size = "md",
    message
}: LoadingSpinnerProps) {

    return (<div className={`flex flex-col items-center justify-center ${sizeClasses[size].gap}`}>
            <FontAwesomeIcon
                icon={faSpinner}
                spin
                className={`${sizeClasses[size].spinner} text-blue-600`}
                role="status"
                aria-label="Cargando"
            />
            {message && <span className={`text-gray-600`}>{message}</span>}
        </div>);
}
