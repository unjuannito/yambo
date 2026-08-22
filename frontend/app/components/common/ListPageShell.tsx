import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { FilterableTable } from "./FilterableTable";
import type {
  FilterableColumn,
  FetchDataParams,
  FilterValues,
  FilterField,
  ContentInfo,
} from "./FilterableTable";
import type { FeaturesConfig, DisplayConfig } from "./FilterableTable";
import type { PagedResponse } from "~/types/apiType";
import { ViewTabs, type ViewTabKey } from "./ViewTabs";
import { PageHeader } from "./PageHeader";
import type { WikiGuideLinkProps } from "./WikiGuideLink";
import { twMerge } from "tailwind-merge";

export interface CompactStat {
  label: string;
  value: number;
  color: "red" | "orange" | "green" | "blue" | "slate";
}

const STAT_COLORS: Record<CompactStat["color"], string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  green: "bg-green-100 text-green-700 border-green-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

interface TabConfig {
  activeTab: ViewTabKey;
  onTabChange: (tab: ViewTabKey) => void;
}

interface ServerSideConfig<T> {
  fetchData: (params: FetchDataParams) => Promise<PagedResponse<T> | null>;
}

interface ListPageShellProps<T> {
  title: ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Enlace "Ver en la wiki" — se muestra debajo del título/subtítulo. */
  wiki?: WikiGuideLinkProps;
  compactStats?: CompactStat[];
  tabs?: TabConfig;
  children?: React.ReactNode;
  // FilterableTable props
  columns: FilterableColumn<T>[];
  keyField: keyof T;
  data?: T[];
  serverSide?: ServerSideConfig<T>;
  features?: FeaturesConfig;
  display?: DisplayConfig<T>;
  filterFn?: (item: T, filters: FilterValues) => boolean;
  extraFilters?: FilterField[];
  renderAboveContent?: (info: ContentInfo<T>) => React.ReactNode;
  renderEmptyState?: (clearFilters: () => void) => React.ReactNode;
}

export default function ListPageShell<T>({
  title,
  subtitle,
  actions,
  wiki,
  compactStats,
  tabs,
  children,
  columns,
  keyField,
  data,
  serverSide,
  features,
  display,
  filterFn,
  extraFilters,
  renderAboveContent,
  renderEmptyState,
}: ListPageShellProps<T>) {
  const { t } = useTranslation();

  return (
    <main className="flex flex-col gap-4 p-3 md:p-4 w-full">
      {/* Header row */}
      <PageHeader title={title} description={subtitle} actions={actions} wiki={wiki} />
      {compactStats && compactStats.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 -mt-3 mb-4">
          {compactStats.map((stat) => (
            <span
              key={stat.label}
              className={twMerge(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                STAT_COLORS[stat.color],
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {stat.label}: {stat.value}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      {tabs && (
        <div className="-mx-3 md:-mx-4 px-3 md:px-4">
          <ViewTabs activeTab={tabs.activeTab} onTabChange={tabs.onTabChange} />
        </div>
      )}

      {/* Slot for extra content (StatusWorkflow, etc.) */}
      {children}

      {/* FilterableTable */}
      <FilterableTable<T>
        columns={columns}
        keyField={keyField}
        data={data}
        serverSide={serverSide}
        features={features}
        display={display}
        filterFn={filterFn}
        extraFilters={extraFilters}
        renderAboveContent={renderAboveContent}
        renderEmptyState={renderEmptyState}
      />
    </main>
  );
}
