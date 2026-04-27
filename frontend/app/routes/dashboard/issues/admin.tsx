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
                        <p className="font-medium text-yambo-black">{row.title}</p>
                        <p className="text-xs text-gray-400">ID: {row.id}</p>
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
                render: (row) => <span className="font-mono text-xs text-gray-500">#{row.orderId}</span>,
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
                render: (row) => <span className="text-sm text-gray-500">{new Date(row.createdAt).toLocaleString("es-ES")}</span>,
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
        <main className="flex flex-col gap-6 p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
            <section className="rounded-[2rem] border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 via-white to-yambo-green-50/40 px-6 py-5 md:px-8 border-b border-gray-100">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-2">Issue navigator</p>
                            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-yambo-black mb-2">Administrador de incidencias</h1>
                            <p className="text-gray-500 max-w-3xl">Vista centralizada para revisar tickets, filtrar el histórico reciente y entrar al detalle con una composición más cercana a un tracker operativo.</p>
                        </div>
                        <ButtonComponent
                            onClick={() => setRefreshKey((prev) => prev + 1)}
                            variant="neutral"
                        >
                            Recargar
                        </ButtonComponent>
                    </div>
                </div>

                <div className="px-6 py-6 md:px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                        <StatCard label="Total" value={stats.total} className="bg-slate-50 rounded-2xl" />
                        <StatCard label="Abiertas" value={stats.open} className="bg-red-50 rounded-2xl" />
                        <StatCard label="En progreso" value={stats.inProgress} className="bg-orange-50 rounded-2xl" />
                        <StatCard label="Resueltas" value={stats.resolved} className="bg-yambo-green-50 rounded-2xl" />
                        <StatCard label="Cerradas" value={stats.closed} className="bg-slate-100 rounded-2xl" />
                        <StatCard label="Reabiertas" value={stats.reopened} className="bg-yambo-purple-50 rounded-2xl" />
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white shadow-sm p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">Workflow</p>
                        <h2 className="text-xl font-bold font-display text-yambo-black">Flujo de trabajo</h2>
                    </div>
                    <span className="text-sm text-gray-400">Estados disponibles para soporte y administración</span>
                </div>
                <StatusWorkflow
                    title="Flujo de trabajo de incidencias"
                    config={ISSUE_STATUS_CONFIG}
                    transitions={ISSUE_WORKFLOW_TRANSITIONS}
                />
            </section>

            <section className="rounded-[2rem] border border-gray-100 bg-white shadow-sm p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">Queue</p>
                        <h2 className="text-xl font-bold font-display text-yambo-black">Cola de incidencias</h2>
                    </div>
                    <span className="text-sm text-gray-400">Filtra por estado, fecha y título sin cambiar la paginación actual</span>
                </div>

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
            </section>
        </main>
    );
}
