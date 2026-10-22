import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface PageContainerProps {
    children: ReactNode;
    className?: string;
}

/**
 * Contenedor estándar de página del dashboard (mi-espacio).
 * Sustituye el patrón repetido `<main className="flex flex-col p-4 md:p-6 w-full">`.
 */
export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <main className={twMerge("flex flex-col p-4 md:p-6 w-full", className)}>
            {children}
        </main>
    );
}
