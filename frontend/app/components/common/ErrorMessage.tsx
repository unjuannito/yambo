import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

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
  const { t } = useTranslation();
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
          <p className="font-semibold">{t("common.error")}</p>
          <p className="text-sm mt-1">{message}</p>
          {onRetry && (
            <ButtonComponent
              variant="danger-text"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              {t("errors.retry")}
            </ButtonComponent>
          )}
        </div>
      </div>
    </div>
  );
}
