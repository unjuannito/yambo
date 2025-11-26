import { createContext, useState, useRef } from "react";
import type { ReactNode } from "react";

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
}

export interface DialogContextType {
    open: (content: ReactNode) => void;
    close: () => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    isOpen: boolean;
}

const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    info: "bg-blue-600 hover:bg-blue-700",
};

export const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [content, setContent] = useState<ReactNode | null>(null);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const open = (dialogContent: ReactNode) => {
        setContent(dialogContent);
        setConfirmOptions(null);
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
        setIsLoading(false);
        setContent(null);
        setConfirmOptions(null);
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    };

    const handleConfirm = () => {
        if (resolveRef.current) {
            resolveRef.current(true);
            resolveRef.current = null;
        }
        setIsOpen(false);
        setConfirmOptions(null);
    };

    const confirm = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setConfirmOptions(options);
            setContent(null);
            setIsOpen(true);
        });
    };

    return (
        <DialogContext.Provider value={{ open, close, confirm, isOpen }}>
            {children}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                    onClick={close}
                >
                    <dialog
                        className="bg-white rounded-lg p-6 max-w-md w-auto justify-self-center m-4"
                        open
                        onClick={(e) => e.stopPropagation()}
                    >
                        {content}
                        {confirmOptions && (
                            <>
                                <h2 className="text-xl font-bold mb-4 text-gray-900">
                                    {confirmOptions.title}
                                </h2>
                                <p className="text-gray-700 mb-6">{confirmOptions.message}</p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={close}
                                        disabled={isLoading}
                                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {confirmOptions.cancelLabel ?? "Cancelar"}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isLoading}
                                        className={`px-4 py-2 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[confirmOptions.variant ?? "info"]}`}
                                    >
                                        {isLoading ? "Procesando..." : (confirmOptions.confirmLabel ?? "Confirmar")}
                                    </button>
                                </div>
                            </>
                        )}
                    </dialog>
                </div>
            )}
        </DialogContext.Provider>
    );
}
