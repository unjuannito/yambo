import { ButtonComponent } from "~/components/common/forms/ButtonComponent";

export interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    previousLabel?: string;
    nextLabel?: string;
}

export function Pagination({
    page,
    totalPages,
    onPageChange,
    previousLabel = "Anterior",
    nextLabel = "Siguiente",
}: PaginationProps) {
    return (
        <nav className="flex justify-center items-center mt-4 flex gap-2">
            <ButtonComponent
                variant="neutral"
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
            >
                {previousLabel}
            </ButtonComponent>
            <div className="px-4 py-2 flex flex-wrap gap-1 justify-center items-center">
                <span>Página</span><span>{page + 1} de {totalPages}</span>
            </div>
            <ButtonComponent
                variant="neutral"
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
            >
                {nextLabel}
            </ButtonComponent>
        </nav>
    );
}
