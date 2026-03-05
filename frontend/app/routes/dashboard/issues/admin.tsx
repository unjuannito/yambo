import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable, type FilterableColumn, type FetchDataParams } from "~/components/common/FilterableTable";
import { issueService, type IssueListItem } from "~/services/issueService";
import { StatCard } from "~/components/common/StatCard";
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
    const { activeTab, setActiveTab } = useViewTab("actual");
    const [refreshKey, setRefreshKey] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        reopened: 0,
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
            // Date range filter from UI overrides the tab-based startDate
            const dateRange = filters.dateRange as { startDate?: string; endDate?: string } | undefined;
            const effectiveStartDate = dateRange?.startDate
                ? new Date(dateRange.startDate).toISOString()
                : startDate;
            const effectiveEndDate = dateRange?.endDate
                ? new Date(dateRange.endDate + "T23:59:59").toISOString()
                : undefined;
            const result = await issueService.getAllIssues(
                page,
                size,
                effectiveStartDate,
                effectiveEndDate,
                statusFilter,
                undefined,
                undefined,
                filters.title,
            );

            if (page === 0) {
                const items = result.content;
                setStats({
                    total: result.page.totalElements,
                    open: items.filter((i) => i.status === IssueStatus.OPEN).length,
                    inProgress: items.filter((i) => i.status === IssueStatus.IN_PROGRESS).length,
                    resolved: items.filter((i) => i.status === IssueStatus.RESOLVED).length,
                    closed: items.filter((i) => i.status === IssueStatus.CLOSED).length,
                    reopened: items.filter((i) => i.status === IssueStatus.REOPENED).length,
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
                header: "Incidencia",
                filter: {
                    enabled: true,
                    type: "search",
                    placeholder: "Buscar por título...",
                },
                render: (row) => (
                    <div>
                        <p className="font-medium text-gray-900">{row.title}</p>
                        <p className="text-xs text-gray-500">ID: {row.id}</p>
                    </div>
                ),
            },
            {
                key: "customerName",
                header: "Cliente",
            },
            {
                key: "orderId",
                header: "Pedido",
                render: (row) => <span className="font-mono text-xs">#{row.orderId}</span>,
            },
            {
                key: "productName",
                header: "Producto",
            },
            {
                key: "status",
                header: "Estado",
                filter: {
                    enabled: true,
                    type: "multi-select",
                    options: statusOptions,
                },
                render: (row) => <IssueStatusBadge status={row.status} />,
            },
            {
                key: "dateRange",
                header: "Creada",
                filter: {
                    enabled: true,
                    type: "date-range",
                },
                render: (row) => new Date(row.createdAt).toLocaleString("es-ES"),
            },
            {
                key: "actions",
                header: "Acciones",
                render: (row) => (
                    <div className="flex flex-wrap gap-2">
                        <ButtonComponent
                            onClick={() => navigate(`/mi-espacio/incidencias/${row.id}`)}
                            size="sm"
                            variant="neutral"
                        >
                            Ver detalle
                        </ButtonComponent>
                    </div>
                ),
            },
        ],
        [navigate, statusOptions],
    );

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="mb-6 rounded-2xl bg-white shadow-md p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Administrador de Incidencias</h1>
                        <p className="text-gray-600">Gestiona incidencias con workflow estilo Jira</p>
                    </div>
                    <ButtonComponent
                        onClick={() => setRefreshKey((prev) => prev + 1)}
                        variant="neutral"
                    >
                        Recargar
                    </ButtonComponent>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    <StatCard label="Total" value={stats.total} className="bg-gray-50" />
                    <StatCard label="Abiertas" value={stats.open} className="bg-red-50" />
                    <StatCard label="En progreso" value={stats.inProgress} className="bg-orange-50" />
                    <StatCard label="Resueltas" value={stats.resolved} className="bg-green-50" />
                    <StatCard label="Cerradas" value={stats.closed} className="bg-slate-100" />
                    <StatCard label="Reabiertas" value={stats.reopened} className="bg-violet-100" />
                </div>
            </div>

            <StatusWorkflow
                title="Flujo de trabajo de incidencias"
                config={ISSUE_STATUS_CONFIG}
                transitions={ISSUE_WORKFLOW_TRANSITIONS}
            />

            <ViewTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setRefreshKey((prev) => prev + 1); }} />

            <FilterableTable<AdminIssueRow>
                keyField="id"
                columns={columns}
                display={{
                    emptyMessage: "No hay incidencias que coincidan con los filtros",
                    loadingMessage: "Cargando incidencias...",
                }}
                features={{
                    enableFilters: true,
                    enablePagination: true,
                }}
                serverSide={{ fetchData: fetchIssuesData }}
            />
        </main>
    );
}


