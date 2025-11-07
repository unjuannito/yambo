import { Button } from "~/components/common/forms/Button";
import type { PaginationProps } from "./types";

export function Pagination({
    page,
    totalPages,
    totalElements,
    size,
    onPageChange,
    itemName = "usuarios",
    previousLabel = "Anterior",
    nextLabel = "Siguiente"
}: PaginationProps) {
    const startItem = page * size + 1;
    const endItem = Math.min((page + 1) * size, totalElements);

    return (
        <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-700">
                Mostrando {startItem} a {endItem} de {totalElements} {itemName}
            </div>
            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                >
                    {previousLabel}
                </Button>
                <span className="px-4 py-2 flex items-center">
                    Página {page + 1} de {totalPages}
                </span>
                <Button
                    variant="secondary"
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                >
                    {nextLabel}
                </Button>
            </div>
        </div>
    );
}