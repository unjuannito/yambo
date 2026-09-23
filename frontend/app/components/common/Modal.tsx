import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    /** Cabecera personalizada (sustituye a la generada con `title`). */
    header?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /**
     * `centered` (por defecto): diálogo centrado.
     * `bottom-sheet`: en móvil se ancla abajo a pantalla completa (hoja inferior);
     * en pantallas `sm+` se comporta como un diálogo centrado.
     */
    variant?: 'centered' | 'bottom-sheet';
    bodyClassName?: string;
    footerClassName?: string;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
};

/** Umbral (px) para descartar la hoja inferior al arrastrar hacia abajo. */
const DISMISS_THRESHOLD_PX = 120;

/**
 * Altura máxima de la hoja inferior (bottom-sheet).
 * Cámbiala aquí para ajustar la altura:
 *   - móvil: `max-h-[92vh]`
 *   - sm+  : `sm:max-h-[90vh]`
 * P. ej. para una hoja más baja usa `max-h-[60vh] sm:max-h-[70vh]`.
 */
const SHEET_MAX_HEIGHT = "max-h-[92dvh] sm:max-h-[90dvh]"; // 92% de la altura de la ventana (móvil), 90% en pantallas sm+

export function Modal({
    isOpen,
    onClose,
    title,
    header,
    children,
    footer,
    size = 'md',
    variant = 'centered',
    bodyClassName,
    footerClassName,
}: ModalProps) {
    const { t } = useTranslation();
    const dragStartY = useRef<number | null>(null);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    if (!isOpen) return null;

    const isSheet = variant === 'bottom-sheet';

    const wrapperClass = isSheet
        ? "fixed inset-0 flex items-end sm:items-center justify-center z-[60] sm:p-4"
        : "fixed inset-0 flex items-center justify-center p-3 sm:p-4 z-[60]";

    const cardClass = isSheet
        ? `bg-white rounded-t-3xl sm:rounded-3xl ${sizeClasses[size]} w-full ${SHEET_MAX_HEIGHT} flex flex-col shadow-2xl sheet-in overflow-hidden`
        : `bg-white rounded-2xl sm:rounded-3xl ${sizeClasses[size]} w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl bounce-in overflow-hidden`;

    const bodyClasses = bodyClassName ?? "p-4 sm:p-6";
    const footerClasses = footerClassName ?? "flex justify-end gap-2 p-4 sm:p-6 border-t border-gray-100 shrink-0";

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        dragStartY.current = e.clientY;
        setIsDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragStartY.current == null) return;
        const dy = e.clientY - dragStartY.current;
        setDragY(dy > 0 ? dy : 0);
    };

    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragStartY.current == null) return;
        const dy = e.clientY - dragStartY.current;
        dragStartY.current = null;
        setIsDragging(false);
        setDragY(0);
        if (dy > DISMISS_THRESHOLD_PX) {
            onClose();
        }
    };

    return (
        <>
        {/* Backdrop — separate element so backdrop-filter doesn't create a containing block */}
        <div
            className="fixed inset-0 bg-yambo-black/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
            role="presentation"
        />
        <div
            className={wrapperClass}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="presentation"
        >
            <div
                className={cardClass}
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: isSheet ? `translateY(${dragY}px)` : undefined,
                    transition: isSheet ? (isDragging ? 'none' : 'transform 0.25s ease-out') : undefined,
                }}
            >
                {/* Asa de arrastre (solo móvil, bottom-sheet) */}
                {isSheet && (
                    <div
                        className="sm:hidden flex flex-col items-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                    >
                        <div className="w-16 h-1.5 rounded-full bg-gray-300" />
                    </div>
                )}

                {/* Header */}
                {header ? (
                    header
                ) : title ? (
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-yambo-black pr-3">{title}</h2>
                        <button type="button"
                            onClick={onClose}
                            className="w-8 h-8 flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-yambo-coral hover:text-white text-lg leading-none transition-all duration-200"
                            aria-label={t("common.close")}
                        >
                            ×
                        </button>
                    </div>
                ) : null}

                {/* Body */}
                <div className={`${bodyClasses} overflow-y-auto flex-1 min-h-0`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className={footerClasses}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}
