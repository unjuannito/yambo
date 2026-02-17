import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable, type FilterableColumn } from "~/components/common/FilterableTable";
import { issueService } from "~/services/issueService";
import { orderService, type Order } from "~/services/orderService";
import { getIssueOrderedProductIds, resolveProductName } from "~/utils/issueUtils";
import { StatCard } from "~/components/common/StatCard";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import { type Issue, IssueStatus, ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { IssueStatusBadge } from "~/components/issues";

interface AdminIssueListItem {
    issue: Issue;
    orderId: string;
    customerName: string;
    productName: string;
}

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
    const [issues, setIssues] = useState<AdminIssueListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIssues = async () => {
        setLoading(true);
        setError(null);

        try {
            const allOrders = await fetchAllOrders();
            const issuesByOrder = await Promise.all(
                allOrders.map(async (order) => {
                    try {
                        const orderIssues = await issueService.getIssuesByOrder(order.id);
                        return {
                            order,
                            orderIssues,
                        };
                    } catch {
                        return {
                            order,
                            orderIssues: [] as Issue[],
                        };
                    }
                }),
            );

            const mapped: AdminIssueListItem[] = issuesByOrder.flatMap(({ order, orderIssues }) =>
                orderIssues.map((issue) => ({
                    issue,
                    orderId: order.id,
                    customerName: order.user?.name || order.user?.email || order.user?.id || "Cliente",
                    productName: resolveProductName(order, issue),
                })),
            );

            setIssues(mapped);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar incidencias de administración"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssues();
    }, []);

    const rows = useMemo<AdminIssueRow[]>(() => {
        return issues
            .map(({ issue, orderId, customerName, productName }) => ({
                id: issue.id,
                title: issue.title,
                description: issue.description,
                status: issue.status,
                orderId,
                customerName,
                productName,
                createdAt: issue.createdAt,
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [issues]);

    const stats = useMemo(() => {
        const open = issues.filter((item) => item.issue.status === IssueStatus.OPEN).length;
        const inProgress = issues.filter((item) => item.issue.status === IssueStatus.IN_PROGRESS).length;
        const resolved = issues.filter((item) => item.issue.status === IssueStatus.RESOLVED).length;
        const closed = issues.filter((item) => item.issue.status === IssueStatus.CLOSED).length;
        const reopened = issues.filter((item) => item.issue.status === IssueStatus.REOPENED).length;

        return {
            total: issues.length,
            open,
            inProgress,
            resolved,
            closed,
            reopened,
        };
    }, [issues]);

    const statusOptions = useMemo(
        () => [
            { value: "", label: "Todos" },
            ...Object.values(IssueStatus).map((status) => ({
                value: status,
                label: ISSUE_STATUS_CONFIG[status].label,
            })),
        ],
        [],
    );

    const columns = useMemo<FilterableColumn<AdminIssueRow>[]>(
        () => [
            {
                key: "title",
                header: "Incidencia",
                filter: {
                    enabled: true,
                    type: "text",
                    placeholder: "Buscar por título",
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
                filter: {
                    enabled: true,
                    type: "text",
                    placeholder: "Buscar cliente",
                },
            },
            {
                key: "orderId",
                header: "Pedido",
                filter: {
                    enabled: true,
                    type: "text",
                    placeholder: "Buscar pedido",
                },
                render: (row) => <span className="font-mono text-xs">#{row.orderId}</span>,
            },
            {
                key: "productName",
                header: "Producto",
                filter: {
                    enabled: true,
                    type: "text",
                    placeholder: "Buscar producto",
                },
            },
            {
                key: "status",
                header: "Estado",
                filter: {
                    enabled: true,
                    type: "select",
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
                        onClick={loadIssues}
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

            <div className="mb-5 bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Flujo de trabajo de incidencias</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span className="px-2 py-1 rounded bg-red-100 text-red-800">Abierto</span>
                    <span>→</span>
                    <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">En progreso</span>
                    <span>→</span>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800">Resuelto</span>
                    <span>→</span>
                    <span className="px-2 py-1 rounded bg-slate-200 text-slate-800">Cerrado</span>
                    <span>↺</span>
                    <span className="px-2 py-1 rounded bg-violet-100 text-violet-800">Reabierto</span>
                </div>
            </div>

            {loading && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <LoadingSpinner size="lg" message="Cargando incidencias..." />
                </div>
            )}

            {error && (
                <ErrorMessage message={error} onRetry={loadIssues} className="mb-4" />
            )}

            {!loading && issues.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No hay incidencias registradas</h2>
                </div>
            )}

            {!loading && (
                <FilterableTable<AdminIssueRow>
                    keyField="id"
                    columns={columns}
                    data={rows}
                    display={{
                        emptyMessage: "No hay incidencias que coincidan con los filtros",
                    }}
                    features={{
                        enableFilters: true,
                        enablePagination: true,
                    }}
                />
            )}
        </main>
    );
}

async function fetchAllOrders(): Promise<Order[]> {
    const size = 200;
    let page = 0;
    let totalPages = 1;
    const orders: Order[] = [];

    while (page < totalPages) {
        const response = await orderService.getAllOrders(page, size);
        orders.push(...response.content);
        totalPages = response.page.totalPages;
        page += 1;
    }

    return orders;
}


