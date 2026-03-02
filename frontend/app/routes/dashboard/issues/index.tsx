import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FilterableTable, type FilterableColumn, type FetchDataParams } from "~/components/common/FilterableTable";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { issueService, type IssueListItem } from "~/services/issueService";
import { StatCard } from "~/components/common/StatCard";
import { IssueStatus, ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { IssueStatusBadge } from "~/components/issues";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";

interface UserIssueRow {
    id: string;
    title: string;
    description: string;
    status: IssueStatus;
    orderId: string;
    productName: string;
    createdAt: string;
}

export default function IssuesPage() {
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
            const result = await issueService.getMyIssues(
                page,
                size,
                startDate,
                undefined,
                statusFilter,
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
                content: result.content.map((item: IssueListItem): UserIssueRow => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    status: item.status as IssueStatus,
                    orderId: item.orderId || "",
                    productName: item.productName || "",
                    createdAt: item.createdAt,
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
                header: "Incidencia",
                render: (row) => (
                    <div>
                        <p className="font-medium text-gray-900">{row.title}</p>
                        <p className="text-xs text-gray-500">ID: {row.id}</p>
                    </div>
                ),
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
                key: "createdAt",
                header: "Creada",
                render: (row) => new Date(row.createdAt).toLocaleString("es-ES"),
            },
            {
                key: "actions",
                header: "Acciones",
                render: (row) => (
                    <ButtonComponent
                        onClick={() => navigate(`/mi-espacio/incidencias/${row.id}`)}
                        size="sm"
                        variant="neutral"
                    >
                        Ver incidencia completa
                    </ButtonComponent>
                ),
            },
        ],
        [navigate, statusOptions],
    );

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="mb-6 rounded-2xl bg-white shadow-md p-6">
                <h1 className="text-3xl font-bold mb-2">Incidencias</h1>
                <p className="text-gray-600 mb-5">Consulta y sigue el estado de todas las incidencias de tus pedidos</p>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    <StatCard label="Total" value={stats.total} className="bg-gray-50" />
                    <StatCard label="Abiertas" value={stats.open} className="bg-red-50" />
                    <StatCard label="En progreso" value={stats.inProgress} className="bg-orange-50" />
                    <StatCard label="Resueltas" value={stats.resolved} className="bg-green-50" />
                    <StatCard label="Cerradas" value={stats.closed} className="bg-slate-100" />
                    <StatCard label="Reabiertas" value={stats.reopened} className="bg-violet-100" />
                </div>
            </div>

            <ViewTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setRefreshKey((prev) => prev + 1); }} />

            <FilterableTable<UserIssueRow>
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


