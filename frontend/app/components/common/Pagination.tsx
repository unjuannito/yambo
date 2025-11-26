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
        <div className="flex justify-center items-center mt-4">
            <div className="flex gap-2">
                <ButtonComponent
                    variant="secondary"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                >
                    {previousLabel}
                </ButtonComponent>
                <span className="px-4 py-2 flex items-center">
                    Página {page + 1} de {totalPages}
                </span>
                <ButtonComponent
                    variant="secondary"
                    onClick={() =>
                        onPageChange(Math.min(totalPages - 1, page + 1))
                    }
                    disabled={page >= totalPages - 1}
                >
                    {nextLabel}
                </ButtonComponent>
            </div>
        </div>
    );
}
