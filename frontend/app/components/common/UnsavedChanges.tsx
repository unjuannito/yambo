import { useEffect } from "react";
import { useBlocker } from "react-router";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

/** Aviso junto al botón de guardar mientras el formulario tiene cambios pendientes. */
export function UnsavedChangesNotice({ show, className = "" }: { show: boolean; className?: string }) {
    const { t } = useTranslation();
    if (!show) return null;
    return (
        <span role="status" className={`inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 ${className}`}>
            <FontAwesomeIcon icon={faCircleExclamation} className="w-3.5 h-3.5" />
            {t("unsavedChanges.notice")}
        </span>
    );
}

/**
 * Evita perder cambios sin guardar: pide confirmación al cambiar de página dentro de la web
 * y deja que el navegador avise al cerrar o recargar la pestaña.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
    const { t } = useTranslation();
    const blocker = useBlocker(when);

    useEffect(() => {
        if (!when) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [when]);

    // Si se guarda mientras el aviso está abierto ya no hay nada que proteger
    useEffect(() => {
        if (!when && blocker.state === "blocked") blocker.proceed();
    }, [when, blocker]);

    return (
        <ConfirmDialog
            isOpen={blocker.state === "blocked"}
            onClose={() => blocker.reset?.()}
            onConfirm={() => blocker.proceed?.()}
            title={t("unsavedChanges.title")}
            message={t("unsavedChanges.message")}
            confirmLabel={t("unsavedChanges.leave")}
            cancelLabel={t("unsavedChanges.stay")}
            variant="warning"
        />
    );
}
