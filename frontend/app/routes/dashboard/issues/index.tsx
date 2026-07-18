import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import ListPageShell from "~/components/common/ListPageShell";
import type { FilterableColumn, FetchDataParams } from "~/components/common/FilterableTable";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { issueService, type IssueListItem } from "~/services/issueService";
import { IssueStatus, ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { IssueStatusBadge } from "~/components/issues";
import { useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";

interface UserIssueRow {
    id: string;
    title: string;
    description: string;
    status: IssueStatus;
    orderId: string;
    productName: string;
    createdAt: string;
    updatedAt: string;
}

export default function IssuesPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { activeTab, setActiveTab } = useViewTab("actual");
    const [refreshKey, setRefreshKey] = useState(0);
    const [stats, setStats] = useState({
        open: 0,
        inProgress: 0,
    });

    const statusOptions = useMemo(
        () =>
            Object.values(IssueStatus).map((status) => ({
                value: status,
                label: ISSUE_STATUS_CONFIG[status].label,
            })),
        [],
    );

    const handleTabChange = useCallback((tab: "actual" | "historico") => {
        setActiveTab(tab);
        setRefreshKey((prev) => prev + 1);
    }, [setActiveTab]);

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
            const result = await issueService.getMyIssues(
                page,
                size,
                effectiveStartDate,
                effectiveEndDate,
                statusFilter,
                filters.title,
            );

            if (page === 0) {
                const items = result.content;
                setStats({
                    open: items.filter((i) => i.status === IssueStatus.OPEN).length,
                    inProgress: items.filter((i) => i.status === IssueStatus.IN_PROGRESS).length,
                });
            }

            return {
                content: result.content.map((item: IssueListItem): UserIssueRow => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    status: item.status as IssueStatus,
                    orderId: item.orderId || "",
                    productName: item.productName || "",
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                })),
                page: result.page,
            };
        },
        [refreshKey, activeTab],
    );

    const columns = useMemo<FilterableColumn<UserIssueRow>[]>(
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
                        {row.orderId && <p className="text-xs text-gray-400 sm:hidden">{t('issues.orderId')} #{row.orderId}</p>}
                        {row.productName && <p className="text-xs text-gray-400 sm:hidden truncate max-w-[160px]">{row.productName}</p>}
                    </div>
                ),
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
                className: "hidden sm:table-cell",
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
                className: "hidden md:table-cell",
                filter: {
                    enabled: true,
                    type: "date-range",
                },
                render: (row) => <span className="text-sm text-gray-500">{new Date(row.updatedAt).toLocaleString("es-ES")}</span>,
            },
            {
                key: "actions",
                header: "",
                render: (row) => (
                    <ButtonComponent
                        onClick={() => navigate(`/mi-espacio/incidencias/${row.id}`)}
                        size="sm"
                        variant="neutral"
                    >
                        <span className="hidden sm:inline">{t('issues.view')}</span>
                        <span className="sm:hidden">{t('issues.viewShort')}</span>
                    </ButtonComponent>
                ),
            },
        ],
        [navigate, statusOptions, t],
    );

    return (
        <ListPageShell<UserIssueRow>
            title={t('issues.title')}
            subtitle={t('issues.myIssuesDesc')}
            actions={
                <ButtonComponent
                    onClick={() => setRefreshKey((prev) => prev + 1)}
                    variant="neutral"
                    size="sm"
                >
                    {t('common.reload')}
                </ButtonComponent>
            }
            compactStats={[
                { label: t('issues.statOpen'), value: stats.open, color: "red" },
                { label: t('issues.statInProgress'), value: stats.inProgress, color: "orange" },
            ]}
            tabs={{
                activeTab,
                onTabChange: handleTabChange,
            }}
            columns={columns}
            keyField="id"
            serverSide={{ fetchData: fetchIssuesData }}
            features={{
                enableFilters: true,
                enablePagination: true,
            }}
        />
    );
}
