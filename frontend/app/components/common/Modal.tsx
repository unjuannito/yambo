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
        <>
        {/* Backdrop — separate element so backdrop-filter doesn't create a containing block */}
        <div
            className="fixed inset-0 bg-yambo-black/40 backdrop-blur-sm z-1"
            onClick={onClose}
        />
        <div
            className="fixed inset-0 flex items-center justify-center p-4 z-1"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`bg-white rounded-3xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col shadow-2xl bounce-in`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {title && (
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                        <h2 className="text-2xl font-bold text-yambo-black">{title}</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-yambo-coral hover:text-white text-lg leading-none transition-all duration-200"
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
                    <div className="flex justify-end gap-2 p-6 border-t border-gray-100 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}
