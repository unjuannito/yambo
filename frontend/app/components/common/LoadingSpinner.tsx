import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | "xl";
    message?: string;
}

const sizeClasses = {
    sm: {
        text: "text-sm",
        fontSize: "1rem",
        gap: "gap-1"
    },
    md: {
        text: "text-md",
        fontSize: "2rem",
        gap: "gap-2"
    },
    lg: {
        text: "text-lg",
        fontSize: "4rem",
        gap: "gap-4"
    },
    xl: {
        text: "text-xl",
        fontSize: "8rem",
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
                className="text-blue-600"
                style={{ fontSize: sizeClasses[size].fontSize }}
                role="status"
                aria-label="Cargando"
            />
            {message && <span className={`text-gray-600`}>{message}</span>}
        </div>);
}
