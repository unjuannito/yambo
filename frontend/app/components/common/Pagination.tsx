import { useTranslation } from "react-i18next";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

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
  previousLabel,
  nextLabel,
}: PaginationProps) {
  const { t } = useTranslation();
  return (
    <nav className="flex justify-center items-center mt-4 flex gap-2">
      <ButtonComponent
        variant="neutral"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
      >
        {previousLabel || t("common.previous")}
      </ButtonComponent>
      <div className="px-4 py-2 flex flex-wrap gap-1 justify-center items-center text-sm">
        <span>{t("common.page")}</span>
        <span className="font-semibold text-yambo-green-600">
          {page + 1} {t("common.of")} {totalPages}
        </span>
      </div>
      <ButtonComponent
        variant="neutral"
        onClick={() =>
          onPageChange(Math.min(totalPages - 1, page + 1))
        }
        disabled={page >= totalPages - 1}
      >
        {nextLabel || t("common.next")}
      </ButtonComponent>
    </nav>
  );
}
