import { useTranslation } from "react-i18next";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { DataTable } from "./DataTable";
import type { TableColumn } from "./DataTable";
import { FiltersSection } from "./FiltersSection";
import { Pagination } from "./Pagination";
import type {
  ColumnFilter,
  FilterField,
  FilterValues,
} from "./types/tableTypes";
import type { PagedInfo, PagedResponse } from "~/types/apiType";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";
import { getErrorMessage } from "~/types/error";
import { twMerge } from "tailwind-merge";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faSlidersH, faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";

export interface FilterableColumn<T = any> extends TableColumn<T> {
  filter?: ColumnFilter;
}

export interface ContentInfo<T> {
  allData: T[];
  filteredData: T[];
  filters: FilterValues;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
}

export interface FetchDataParams {
  page: number;
  size: number;
  filters: FilterValues;
}

interface ServerSideProps<T> {
  fetchData: (params: FetchDataParams) => Promise<PagedResponse<T> | null>;
  initialPage?: number;
  initialSize?: number;
  initialFilters?: FilterValues;
}

export type ViewMode = "table" | "grid";

export interface DisplayConfig<T> {
  type?: ViewMode;
  emptyMessage?: string;
  loadingMessage?: string;
  renderItem?: (item: T) => React.ReactNode;
  gridClassName?: string;
  onRowClick?: (item: T) => void;
  /** Renders a card for each item on mobile (<768px). Table is shown on desktop. */
  renderMobileCard?: (item: T) => React.ReactNode;
}

export interface FeaturesConfig {
  enableFilters?: boolean;
  enablePagination?: boolean;
  enableLoadMore?: boolean;
  loadMoreLabel?: string;
  globalSearch?: boolean;
}

export interface FilterableTableProps<T> {
  columns: FilterableColumn<T>[];
  keyField: keyof T;
  className?: string;
  display?: DisplayConfig<T>;
  features?: FeaturesConfig;
  serverSide?: ServerSideProps<T>;
  data?: T[];
  extraFilters?: FilterField[];
  renderAboveContent?: (info: ContentInfo<T>) => React.ReactNode;
  renderEmptyState?: (clearFilters: () => void) => React.ReactNode;
  filterFn?: (item: T, filters: FilterValues) => boolean;
}

export type {
  ColumnFilter,
  FilterOption,
  FilterValues,
} from "./types/tableTypes";
export type { FilterField } from "./types/tableTypes";

const EMPTY_FILTERS: FilterValues = {};

export function FilterableTable<T>({
  columns,
  keyField,
  className = "",
  display = {},
  features = {},
  serverSide,
  data: clientData,
  extraFilters,
  renderAboveContent,
  renderEmptyState,
  filterFn,
}: FilterableTableProps<T>) {
  const { t } = useTranslation();
  const {
    type: viewMode = "table",
    emptyMessage = t('common.noResults'),
    loadingMessage = t('table.loadingMessage') || "Cargando datos...",
    renderItem: renderGridItem,
    gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
    onRowClick,
    renderMobileCard,
  } = display;

  const {
    enableFilters = true,
    enablePagination = true,
    enableLoadMore = false,
    loadMoreLabel = t('common.showMore'),
    globalSearch = false,
  } = features;

  const isServerSide = Boolean(serverSide);
  const isGridMode = viewMode === "grid";

  if (isGridMode && !renderGridItem) {
    throw new Error('renderGridItem is required when viewMode is "grid"');
  }

  const [serverData, setServerData] = useState<T[]>([]);
  const [pageInfo, setPageInfo] = useState<PagedInfo>({
    number: serverSide?.initialPage ?? 0,
    size: serverSide?.initialSize ?? 10,
    totalElements: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<FilterValues>(
    serverSide?.initialFilters ?? EMPTY_FILTERS
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipNextFetchRef = useRef(false);

  // Collapsible filters: default collapsed on mobile (< 768px), expanded on desktop
  const [filtersCollapsed, setFiltersCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  const [clientPage, setClientPage] = useState(0);
  const [clientFilters, setClientFilters] =
    useState<FilterValues>(EMPTY_FILTERS);
  const clientPageSize = 10;

  const executeFetch = useCallback(async () => {
    if (!serverSide?.fetchData) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await serverSide.fetchData({
        page: pageInfo.number,
        size: pageInfo.size,
        filters,
      });
      if (result) {
        setServerData(result.content);
        setPageInfo(result.page);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Error al cargar los datos");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [serverSide?.fetchData, pageInfo.number, pageInfo.size, filters]);

  useEffect(() => {
    if (isServerSide) {
      void executeFetch();
    }
  }, [executeFetch, isServerSide]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (isServerSide) {
        setPageInfo((prev) => ({ ...prev, number: page }));
      } else {
        setClientPage(page);
      }
    },
    [isServerSide]
  );

  const handleLoadMore = useCallback(async () => {
    if (isServerSide) {
      if (!serverSide?.fetchData) return;
      if (isLoading || isLoadingMore) return;
      const nextPage = pageInfo.number + 1;
      if (nextPage >= pageInfo.totalPages) return;

      setIsLoadingMore(true);
      setError(null);
      try {
        const result = await serverSide.fetchData({
          page: nextPage,
          size: pageInfo.size,
          filters,
        });
        if (result) {
          setServerData((prev) => [...prev, ...result.content]);
          skipNextFetchRef.current = true;
          setPageInfo(result.page);
        }
      } catch (err) {
        const errorMessage = getErrorMessage(err, "Error al cargar los datos");
        setError(errorMessage);
      } finally {
        setIsLoadingMore(false);
      }
    } else {
      setClientPage((prev) => prev + 1);
    }
  }, [
    filters,
    isLoading,
    isLoadingMore,
    isServerSide,
    pageInfo.number,
    pageInfo.size,
    pageInfo.totalPages,
    serverSide?.fetchData,
  ]);

  const handleFiltersChange = useCallback(
    (newFilters: FilterValues) => {
      if (isServerSide) {
        setServerData([]);
        setFilters(newFilters);
        setPageInfo((prev) => ({ ...prev, number: 0 }));
      } else {
        setClientFilters(newFilters);
        setClientPage(0);
      }
    },
    [isServerSide]
  );

  const data = isServerSide ? serverData : (clientData ?? []);

  const filterFields = useMemo(() => {
    const columnFilters = columns
      .filter((col) => col.filter?.enabled)
      .map((col) => ({
        key: col.key,
        label: typeof col.header === "string" ? col.header : "",
        type: col.filter?.type || "text",
        placeholder: col.filter?.placeholder,
        options: col.filter?.options,
      }));
    if (extraFilters && extraFilters.length > 0) {
      return [...columnFilters, ...extraFilters];
    }
    return columnFilters;
  }, [columns, extraFilters]);

  // Global search state — defined after filterFields to avoid TDZ issues
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const globalSearchRef = useRef<HTMLInputElement>(null);

  const globalSearchFields = useMemo(() => {
    if (!globalSearch) return [];
    return filterFields.filter((f) => f.type === "search" || f.type === "text");
  }, [globalSearch, filterFields]);

  const handleGlobalSearch = useCallback(
    (value: string) => {
      setGlobalSearchQuery(value);
      const newFilters: FilterValues = {};
      if (isServerSide) {
        // Server-side: send a single 'q' key for cross-field search
        newFilters.q = value;
      } else {
        // Client-side: spread to all searchable fields for local filtering
        for (const field of globalSearchFields) {
          newFilters[field.key] = value;
        }
      }
      if (isServerSide) {
        setServerData([]);
        setFilters(newFilters);
        setPageInfo((prev) => ({ ...prev, number: 0 }));
      } else {
        setClientFilters(newFilters);
        setClientPage(0);
      }
    },
    [globalSearchFields, isServerSide]
  );

  const filteredData = useMemo(() => {
    if (isServerSide) return data;
    let result = [...data];

    if (filterFn) {
      const activeFilterValues = enableFilters
        ? clientFilters
        : EMPTY_FILTERS;
      const hasActiveValues = Object.values(activeFilterValues).some(
        (v) =>
          v !== undefined &&
          v !== "" &&
          v !== null &&
          !(Array.isArray(v) && v.length === 0)
      );
      if (hasActiveValues) {
        result = result.filter((item) => filterFn(item, activeFilterValues));
      }
      return result;
    }

    if (enableFilters) {
      Object.entries(clientFilters).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === null) return;
        if (Array.isArray(value)) {
          if (value.length === 0) return;
          const matchesArrayFilter = (item: T) => {
            const itemValue = item[key as keyof T];
            if (Array.isArray(itemValue)) {
              return itemValue.some((obj: any) => {
                const idValue = obj?.id ?? obj;
                return value.includes(String(idValue));
              });
            }
            return value.includes(String(itemValue));
          };
          result = result.filter(matchesArrayFilter);
        } else {
          const lowered = String(value).toLowerCase();
          const matchesTextFilter = (item: T) => {
            const itemValue = item[key as keyof T];
            return String(itemValue ?? "")
              .toLowerCase()
              .includes(lowered);
          };
          result = result.filter(matchesTextFilter);
        }
      });
    }

    return result;
  }, [data, clientFilters, columns, enableFilters, isServerSide, filterFn]);

  const paginatedData = useMemo(() => {
    if (isServerSide) return data;
    if (!enablePagination) return filteredData;
    if (enableLoadMore) {
      return filteredData.slice(0, (clientPage + 1) * clientPageSize);
    }
    const startIndex = clientPage * clientPageSize;
    return filteredData.slice(startIndex, startIndex + clientPageSize);
  }, [
    filteredData,
    clientPage,
    clientPageSize,
    enablePagination,
    enableLoadMore,
    isServerSide,
    data,
  ]);

  const displayPageInfo: PagedInfo = isServerSide
    ? pageInfo
    : {
        number: clientPage,
        size: clientPageSize,
        totalElements: filteredData.length,
        totalPages: Math.ceil(filteredData.length / clientPageSize) || 1,
      };

  const activeFilters = isServerSide ? filters : clientFilters;

  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter(
      (v) =>
        v !== undefined &&
        v !== "" &&
        v !== null &&
        !(Array.isArray(v) && v.length === 0)
    ).length;
  }, [activeFilters]);

  const clearAllFilters = useCallback(() => {
    handleFiltersChange(EMPTY_FILTERS);
  }, [handleFiltersChange]);

  const updateSingleFilter = useCallback(
    (key: string, value: any) => {
      const newFilters = { ...activeFilters, [key]: value };
      handleFiltersChange(newFilters);
    },
    [activeFilters, handleFiltersChange]
  );

  const contentInfo: ContentInfo<T> = useMemo(
    () => ({
      allData: data,
      filteredData,
      filters: activeFilters,
      updateFilter: updateSingleFilter,
      clearFilters: clearAllFilters,
    }),
    [data, filteredData, activeFilters, updateSingleFilter, clearAllFilters]
  );

  const loadMoreInfo = useMemo(() => {
    if (!enableLoadMore || !isServerSide) return null;
    const shown = serverData.length;
    const total = pageInfo.totalElements;
    const canLoad = pageInfo.number + 1 < pageInfo.totalPages;
    return { shown, total, canLoad };
  }, [enableLoadMore, isServerSide, serverData.length, pageInfo]);

  const renderContent = () => {
    if (isLoading && !isLoadingMore) {
      return <LoadingSpinner message={loadingMessage} size="md" />;
    }

    if (paginatedData.length === 0 && !isLoadingMore) {
      if (renderEmptyState) {
        return renderEmptyState(clearAllFilters);
      }
      return (
        <div className="text-center py-12">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      );
    }

    const canLoadMore =
      enableLoadMore &&
      (loadMoreInfo?.canLoad ??
        displayPageInfo.number + 1 < displayPageInfo.totalPages);

    if (isGridMode && renderGridItem) {
      return (
        <>
          <div className={gridClassName}>
            {paginatedData.map((item) => (
              <div
                key={String(item[keyField])}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick?.(item); } }}
                role="button"
                tabIndex={0}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {renderGridItem(item)}
              </div>
            ))}
          </div>
          {enablePagination && (
            <Pagination
              page={displayPageInfo.number}
              totalPages={displayPageInfo.totalPages}
              onPageChange={handlePageChange}
            />
          )}
          {(canLoadMore || isLoadingMore) && (
            <div className="flex flex-col items-center gap-2 py-2">
              {loadMoreInfo && (
                <span className="text-xs text-gray-400">
                  {t('table.showing') || "Mostrando"} {loadMoreInfo.shown} {t('common.of')} {loadMoreInfo.total}
                </span>
              )}
              <ButtonComponent
                variant="neutral"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
              >
                {loadMoreLabel}
              </ButtonComponent>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        {renderMobileCard && (
          <div className="block md:hidden space-y-3">
            {paginatedData.map((item) => (
              <div
                key={String(item[keyField])}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick?.(item); } }}
                role="button"
                tabIndex={0}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {renderMobileCard(item)}
              </div>
            ))}
          </div>
        )}
        <div className={renderMobileCard ? "hidden md:block" : ""}>
          <DataTable
            data={paginatedData}
            columns={columns}
            keyField={keyField}
            onRowClick={onRowClick}
          />
        </div>
        {enablePagination && !enableLoadMore && (
          <Pagination
            page={displayPageInfo.number}
            totalPages={displayPageInfo.totalPages}
            onPageChange={handlePageChange}
          />
        )}
        {(canLoadMore || isLoadingMore) && (
          <div className="flex flex-col items-center gap-2 py-2">
            {loadMoreInfo && (
              <span className="text-xs text-gray-400">
                {t('table.showing') || "Mostrando"} {loadMoreInfo.shown} {t('common.of')} {loadMoreInfo.total}
              </span>
            )}
            <ButtonComponent
              variant="neutral"
              onClick={handleLoadMore}
              isLoading={isLoadingMore}
            >
              {loadMoreLabel}
            </ButtonComponent>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={twMerge(`flex flex-col gap-3 min-w-0 ${className}`)}>
      {enableFilters && filterFields.length > 0 && (
        <div className="flex flex-col gap-2">
          {globalSearch ? (
            /* ── Global search bar ── */
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={globalSearchRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                placeholder={t('table.globalSearch')}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yambo-green-300 focus:bg-white transition-all border border-gray-100 focus:border-yambo-green-400 placeholder:text-gray-400"
              />
              {globalSearchQuery && (
                <button
                  onClick={() => handleGlobalSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* ── Per-column filters (collapsible) ── */
            <>
            <button
            type="button"
            onClick={() => setFiltersCollapsed((c) => !c)}
            className="flex items-center gap-2 self-start px-3 py-1.5 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faSlidersH} className="w-3.5 h-3.5" />
            <span>{t('common.filter')}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yambo-green-500 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            <FontAwesomeIcon
              icon={filtersCollapsed ? faChevronDown : faChevronUp}
              className="w-3 h-3 text-gray-400 ml-0.5"
            />
          </button>
          {/* Collapsible filter panel */}
          {!filtersCollapsed && (
            <FiltersSection
              filters={activeFilters}
              fields={filterFields}
              onFiltersChange={handleFiltersChange}
            />
          )}
            </>
          )}
        </div>
      )}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={isServerSide ? executeFetch : undefined}
        />
      )}
      {renderAboveContent && renderAboveContent(contentInfo)}
      {renderContent()}
    </div>
  );
}
