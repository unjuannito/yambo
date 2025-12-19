import { useContext } from "react";
import { DialogContext } from "~/context/DialogContext";

export const useDialog = () => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error("useDialog debe usarse dentro de DialogProvider");
    return ctx;
};
