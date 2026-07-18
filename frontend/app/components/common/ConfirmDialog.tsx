import { useTranslation } from "react-i18next";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const confirmButtonVariant: Record<string, "danger" | "primary"> = {
  danger: "danger",
  warning: "primary",
  info: "primary",
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "info",
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl bounce-in">
        <h2 className="text-xl font-bold font-display mb-4 text-gray-900">
          {title}
        </h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <ButtonComponent
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel || t("common.cancel")}
          </ButtonComponent>
          <ButtonComponent
            variant={confirmButtonVariant[variant] ?? "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel || t("common.confirm")}
          </ButtonComponent>
        </div>
      </div>
    </div>
  );
}
