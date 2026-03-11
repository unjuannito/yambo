import { createContext, useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import toast from "react-hot-toast";

type DialogVariant = "info" | "warning" | "danger" | "success";

const variantToButtonVariant: Record<
    DialogVariant,
    "primary" | "destructive" | "success"
> = {
    info: "primary",
    warning: "primary",
    danger: "destructive",
    success: "success",
};

export interface DialogOptions {
    title: string;
    children: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: DialogVariant;
    action: (event: any) =>
        | { success: true; result: any }
        | { success: true; result: any; successMessage: any }
        | { success: false; errorMessage: string }
        | Promise<{ success: true; result: any; successMessage: any }
            | { success: true; result: any }
            | { success: false; errorMessage: string }>;
}

export interface DialogContextType {
    openDialog: (options: DialogOptions) => void;
    closeDialog: () => void;
    isOpen: boolean;
}

export const DialogContext = createContext<DialogContextType | undefined>(
    undefined
);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const resolverRef = useRef<{
        resolve?: (value: any) => void;
        reject?: (reason?: any) => void;
    }>({});

    useEffect(() => {
        if (dialogRef.current === null) return;
        if (isOpen) {
            dialogRef.current.showModal();
        } else {
            dialogRef.current.close();
        }
    }, [isOpen]);

    const closeDialog = () => {
        setIsOpen(false);
        setIsLoading(false);
        setDialogOptions(null);
    };

    const openDialog = (options: DialogOptions): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolverRef.current = { resolve, reject };
            setDialogOptions(options);
            setIsOpen(true);
        });
    };

    const handleSubmit = async (event: any) => {
        event?.preventDefault?.();
        setIsLoading(true);

        try {
            const response = await dialogOptions?.action(event);

            if (response?.success) {
                if ("successMessage" in response && response.successMessage) {
                    toast.success(response.successMessage);
                }

                resolverRef.current.resolve?.(response.result);
            } else {
                toast.error(response?.errorMessage || "Ha ocurrido un error");
                resolverRef.current.reject?.(response?.errorMessage);
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : "Ha ocurrido un error";
            toast.error(message);
            resolverRef.current.reject?.(err);

        } finally {
            closeDialog();
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            closeDialog();
            resolverRef.current.reject?.("user-cancelled");
        }
    };


    return (
        <DialogContext.Provider value={{ openDialog, closeDialog, isOpen }}>
            {children}
            <dialog
                className={`${isOpen ? 'flex' : 'hidden'} fixed inset-0 bg-white rounded-lg justify-self-center self-center backdrop:bg-black/50 max-w-[90dvw] max-h-[80dvh] overflow-visible z-9`}
                onClick={handleBackdropClick}
                ref={dialogRef}
            >
                <form method="dialog" className="p-6 flex flex-col gap-4" onSubmit={handleSubmit}>
                    <h2 className="text-xl font-bold text-gray-900">
                        {dialogOptions?.title}
                    </h2>
                    {dialogOptions?.children}
                    <menu className="flex justify-end gap-3">
                        <ButtonComponent
                            type="button"
                            onClick={() => {closeDialog(); resolverRef.current.reject?.('user-cancelled');}}
                            isLoading={isLoading}
                            variant="neutral"
                        >
                            {dialogOptions?.cancelLabel ?? "Cancelar"}
                        </ButtonComponent>
                        <ButtonComponent
                            isLoading={isLoading}
                            variant={
                                variantToButtonVariant[
                                dialogOptions?.variant ?? "info"
                                ]
                            }
                        >
                            {isLoading
                                ? "Procesando..."
                                : (dialogOptions?.confirmLabel ??
                                    "Confirmar")}
                        </ButtonComponent>
                    </menu>
                </form>
            </dialog>
        </DialogContext.Provider>
    );
}
