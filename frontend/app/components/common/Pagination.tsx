import { useTranslation } from "react-i18next";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  /** Total number of elements (enables the "Mostrando X a Y de Z resultados" summary). */
  totalElements?: number;
  /** Elements per page, shown as "N por página". Defaults to 10. */
  pageSize?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
  totalElements,
  pageSize,
}: PaginationProps) {
  const { t } = useTranslation();
  const size = pageSize ?? 10;
  const hasSummary = totalElements !== undefined;
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements ?? 0);

  return (
    <nav className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-sm text-gray-500">
        {hasSummary
          ? t("table.showing", { from, to, total: totalElements ?? 0 })
          : ""}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">
          {size} {t("table.perPage")}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <ButtonComponent
              variant="neutral"
              size="sm"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              {previousLabel || t("common.previous")}
            </ButtonComponent>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {t("common.page")}{" "}
              <span className="font-semibold text-yambo-green-600">
                {page + 1} {t("common.of")} {totalPages}
              </span>
            </span>
            <ButtonComponent
              variant="neutral"
              size="sm"
              onClick={() =>
                onPageChange(Math.min(totalPages - 1, page + 1))
              }
              disabled={page >= totalPages - 1}
            >
              {nextLabel || t("common.next")}
            </ButtonComponent>
          </div>
        )}
      </div>
    </nav>
  );
}
