import { createContext, useState, useRef } from "react";
import type { ReactNode } from "react";
import { ButtonComponent } from "../components/common/forms/ButtonComponent";

export interface ConfirmOptions {
    title: string;
    children: ReactNode;
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
                                <div className="text-gray-700 mb-6">{confirmOptions.children}</div>
                                <div className="flex justify-end gap-3">
                                    <ButtonComponent
                                        onClick={close}
                                        disabled={isLoading}
                                        variant="secondary"
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                                    >
                                        {confirmOptions.cancelLabel ?? "Cancelar"}
                                    </ButtonComponent>
                                    <ButtonComponent
                                        onClick={handleConfirm}
                                        disabled={isLoading}
                                        variant={confirmOptions.variant ?? "info"}
                                    >
                                        {isLoading ? "Procesando..." : (confirmOptions.confirmLabel ?? "Confirmar")}
                                    </ButtonComponent>
                                </div>
                            </>
                        )}
                    </dialog>
                </div>
            )}
        </DialogContext.Provider>
    );
}
