import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const { t } = useTranslation();
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                    bg-white border border-gray-200 text-gray-600 hover:border-yambo-green-300 hover:text-yambo-green-600
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600"
            >
                <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
                {t('common.previous')}
            </button>

            {Array.from({ length: totalPages }, (_, i) => {
                // Show first, last, and pages around current
                const showPage =
                    i === 0 ||
                    i === totalPages - 1 ||
                    Math.abs(i - currentPage) <= 1;

                if (!showPage) {
                    const prevShown = i === currentPage - 2 || i === 1;
                    return prevShown ? (
                        <span key={i} className="px-1 text-gray-300 text-sm">···</span>
                    ) : null;
                }

                return (
                    <button
                        key={i}
                        onClick={() => onPageChange(i)}
                        className={`min-w-[36px] h-9 rounded-xl text-sm font-semibold transition-all ${
                            i === currentPage
                                ? "bg-yambo-green-600 text-white shadow-sm"
                                : "bg-white border border-gray-200 text-gray-600 hover:border-yambo-green-300 hover:text-yambo-green-600"
                        }`}
                    >
                        {i + 1}
                    </button>
                );
            })}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                    bg-white border border-gray-200 text-gray-600 hover:border-yambo-green-300 hover:text-yambo-green-600
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600"
            >
                {t('common.next')}
                <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
            </button>
        </div>
    );
}
