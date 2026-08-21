import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable, type FilterableColumn, type FetchDataParams } from "~/components/common/FilterableTable";
import { issueService, type IssueListItem } from "~/services/issueService";
import { type Issue, IssueStatus, ISSUE_STATUS_CONFIG, ISSUE_WORKFLOW_TRANSITIONS } from "~/types/issueType";
import { IssueStatusBadge } from "~/components/issues";
import { StatusWorkflow } from "~/components/common/StatusWorkflow";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";

interface AdminIssueRow {
    id: string;
    title: string;
    description: string;
    status: IssueStatus;
    orderId: string;
    customerName: string;
    productName: string;
    createdAt: string;
    updatedAt: string;
}

export default function AdminIssuesPage() {
    return (
        <RequirePermission permission={{ obj: "issue", action: "read" }} redirectTo="/mi-espacio">
            <AdminIssuesContent />
        </RequirePermission>
    );
}

function AdminIssuesContent() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { activeTab, setActiveTab } = useViewTab("actual");
    const [searchParams, setSearchParams] = useSearchParams();
    const [refreshKey, setRefreshKey] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        inProgress: 0,
        closed: 0,
    });

    const statusOptions = useMemo(
        () =>
            Object.values(IssueStatus).map((status) => ({
                value: status,
                label: ISSUE_STATUS_CONFIG[status].label,
            })),
        [],
    );

    const fetchIssuesData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const statusFilter = Array.isArray(filters.status) && filters.status.length > 0
                ? filters.status as string[]
                : undefined;
            const dateRange = filters.dateRange as { startDate?: string; endDate?: string } | undefined;
            const effectiveStartDate = dateRange?.startDate
                ? new Date(dateRange.startDate).toISOString()
                : startDate;
            const effectiveEndDate = dateRange?.endDate
                ? new Date(dateRange.endDate + "T23:59:59").toISOString()
                : undefined;
            const userId = searchParams.get("userId") || undefined;
            const result = await issueService.getAllIssues(
                page,
                size,
                effectiveStartDate,
                effectiveEndDate,
                statusFilter,
                filters.q,
                userId,
                undefined,
                undefined,
            );

            if (page === 0) {
                const items = result.content;
                setStats({
                    total: result.page.totalElements,
                    open: items.filter((i) => i.status === IssueStatus.OPEN).length,
                    inProgress: items.filter((i) => i.status === IssueStatus.IN_PROGRESS).length,
                    closed: items.filter((i) => i.status === IssueStatus.CLOSED).length,
                });
            }

            return {
                content: result.content.map((item: IssueListItem): AdminIssueRow => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    status: item.status as IssueStatus,
                    orderId: item.orderId || "",
                    customerName: item.customerName || "",
                    productName: item.productName || "",
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                })),
                page: result.page,
            };
        },
        [refreshKey, activeTab],
    );

    const columns = useMemo<FilterableColumn<AdminIssueRow>[]>(
        () => [
            {
                key: "title",
                header: t('issues.issueNumber'),
                filter: {
                    enabled: true,
                    type: "search",
                    placeholder: t('issues.searchByTitle'),
                },
                render: (row) => (
                    <div className="min-w-0">
                        <p className="font-medium text-yambo-black truncate max-w-[200px] sm:max-w-none">{row.title}</p>
                        <p className="text-xs text-gray-400 font-mono">#{row.id}</p>
                        {row.customerName && <p className="text-xs text-gray-400 sm:hidden truncate max-w-[160px]">{row.customerName}</p>}
                        {row.orderId && <p className="text-xs text-gray-400 sm:hidden">{t('issues.orderId')} #{row.orderId}</p>}
                    </div>
                ),
            },
            {
                key: "customerName",
                header: t('issues.customer'),
                className: "hidden sm:table-cell",
            },
            {
                key: "orderId",
                header: t('issues.orderId'),
                className: "hidden sm:table-cell",
                render: (row) => <span className="font-mono text-xs text-gray-500">#{row.orderId}</span>,
            },
            {
                key: "productName",
                header: t('issues.product'),
                className: "hidden md:table-cell",
            },
            {
                key: "status",
                header: t('issues.status'),
                filter: {
                    enabled: true,
                    type: "multi-select",
                    options: statusOptions,
                },
                render: (row) => <IssueStatusBadge status={row.status} />,
            },
            {
                key: "dateRange",
                header: t('issues.updatedAt'),
                className: "hidden lg:table-cell",
                filter: {
                    enabled: true,
                    type: "date-range",
                },
                render: (row) => <span className="text-sm text-gray-500">{new Date(row.updatedAt).toLocaleString("es-ES")}</span>,
            },
            {
                key: "actions",
                header: "",
                requiredPerms: [{ obj: "issue", action: "read" }],
                render: (row) => (
                    <ButtonComponent
                        onClick={() => navigate(`/mi-espacio/incidencias/${row.id}`)}
                        size="sm"
                        variant="neutral"
                    >
                        {t('common.view')}
                    </ButtonComponent>
                ),
            },
        ],
        [navigate, statusOptions, t],
    );

    return (
        <ListPageShell<AdminIssueRow>
            title={t('issues.adminTitle')}
            subtitle={t('issues.adminDesc')}
            compactStats={[
                { label: t('issues.statOpen'), value: stats.open, color: "red" },
                { label: t('issues.statInProgress'), value: stats.inProgress, color: "orange" },
            ]}
            actions={
                <ButtonComponent onClick={() => setRefreshKey((prev) => prev + 1)} variant="neutral" size="sm">
                    {t('common.reload')}
                </ButtonComponent>
            }
            columns={columns}
            keyField="id"
            display={{
                emptyMessage: t('issues.noIssues'),
                loadingMessage: t('issues.loading'),
                renderMobileCard: (row: AdminIssueRow) => (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-medium text-yambo-black truncate">{row.title}</p>
                                <p className="text-xs text-gray-400 font-mono">#{row.id}</p>
                            </div>
                            <IssueStatusBadge status={row.status} />
                        </div>
                        {row.customerName && (
                            <p className="text-xs text-gray-500">{row.customerName}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-xs text-gray-400">
                                {new Date(row.updatedAt).toLocaleString("es-ES")}
                            </span>
                            <ButtonComponent
                                onClick={() => navigate(`/mi-espacio/incidencias/${row.id}`)}
                                size="sm"
                                variant="neutral"
                            >
                                {t('common.view')}
                            </ButtonComponent>
                        </div>
                    </div>
                ),
            }}
            features={{ globalSearch: true, enableFilters: true, enablePagination: true }}
            tabs={{
                activeTab,
                onTabChange: (tab) => { setActiveTab(tab); setRefreshKey((prev) => prev + 1); },
            }}
            serverSide={{ fetchData: fetchIssuesData }}
        >
            {/* URL filter indicators */}
            {searchParams.get("userId") && (
                <div className="flex items-center gap-2 mb-4 px-1">
                    <span className="text-xs text-gray-400 font-medium">Filtros activos:</span>
                    <span className="inline-flex items-center gap-1.5 bg-yambo-green-50 text-yambo-green-700 rounded-full px-3 py-1 text-xs font-medium">
                        <FontAwesomeIcon icon={faUser} className="w-3 h-3" />
                        Usuario: {searchParams.get("userId")}
                        <button
                            onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.delete("userId");
                                setSearchParams(next, { replace: true });
                            }}
                            className="ml-0.5 text-yambo-green-500 hover:text-yambo-green-800 transition-colors"
                            title="Quitar filtro"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                        </button>
                    </span>
                </div>
            )}
            <StatusWorkflow
                title={t('issues.workflowTitle')}
                config={ISSUE_STATUS_CONFIG}
                transitions={ISSUE_WORKFLOW_TRANSITIONS}
            />
        </ListPageShell>
    );
}