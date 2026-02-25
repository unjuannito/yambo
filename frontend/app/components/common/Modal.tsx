import type { ReactNode } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md'
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-2"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`bg-white rounded-lg ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {title && (
                    <div className="flex justify-between items-center p-6 border-b shrink-0">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                            aria-label="Cerrar"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex justify-end gap-2 p-6 border-t shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
