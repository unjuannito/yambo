import { createContext, useState } from "react";
import type { ReactNode } from "react";

export interface DialogContextType {
    open: (content: ReactNode) => void;
    close: () => void;
    isOpen: boolean;
    content: ReactNode | null;
}

export const DialogContext = createContext<DialogContextType | undefined>(
    undefined
);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState<ReactNode | null>(null);

    const open = (dialogContent: ReactNode) => {
        setContent(dialogContent);
        setIsOpen(true);
    };
    const close = () => {
        setIsOpen(false);
        setContent(null);
    };

    return (
        <DialogContext.Provider value={{ open, close, isOpen, content }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={close}>
                    <dialog className="bg-white rounded-lg p-6 max-w-md w-full justify-self-center" open onClick={(e) => e.stopPropagation()}>
                        {content}
                    </dialog>
                </div>
            )}
        </DialogContext.Provider>
    );
}
