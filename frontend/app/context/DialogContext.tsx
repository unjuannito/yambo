import { createContext, useState, useRef } from "react";
import type { ReactNode } from "react";
import { ButtonComponent } from "../components/common/forms/ButtonComponent";

type DialogVariant = "info" | "warning" | "danger" | "success";

// Maps dialog semantic variants to button variants
const variantToButtonVariant: Record<
    DialogVariant,
    "primary" | "destructive" | "success"
> = {
    info: "primary",
    warning: "primary",
    danger: "destructive",
    success: "success",
};

export interface ConfirmOptions {
    title: string;
    children: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: DialogVariant;
}

export interface DialogContextType {
    openDialog: (options: ConfirmOptions) => Promise<boolean>;
    closeDialog: () => void;
    isOpen: boolean;
}

export const DialogContext = createContext<DialogContextType | undefined>(
    undefined
);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(
        null
    );
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const closeDialog = () => {
        setIsOpen(false);
        setIsLoading(false);
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

    const openDialog = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setConfirmOptions(options);
            setIsOpen(true);
        });
    };

    return (
        <DialogContext.Provider value={{ openDialog, closeDialog, isOpen }}>
            {children}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                    onClick={close}
                >
                    <dialog
                        className="bg-white rounded-lg p-6 max-w-md w-auto justify-self-center m-4 flex flex-col gap-4"
                        open
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900">
                            {confirmOptions?.title}
                        </h2>
                        {confirmOptions?.children}
                        <nav className="flex justify-end gap-3">
                            <ButtonComponent
                                onClick={closeDialog}
                                disabled={isLoading}
                                variant="neutral"
                            >
                                {confirmOptions?.cancelLabel ?? "Cancelar"}
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleConfirm}
                                disabled={isLoading}
                                variant={
                                    variantToButtonVariant[
                                        confirmOptions?.variant ?? "info"
                                    ]
                                }
                            >
                                {isLoading
                                    ? "Procesando..."
                                    : (confirmOptions?.confirmLabel ??
                                      "Confirmar")}
                            </ButtonComponent>
                        </nav>
                    </dialog>
                </div>
            )}
        </DialogContext.Provider>
    );
}
