import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FilterableTable, type FilterableColumn } from "~/components/common/FilterableTable";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { issueService } from "~/services/issueService";
import { orderService, type Order } from "~/services/orderService";
import { getIssueOrderedProductIds, resolveProductName } from "~/utils/issueUtils";
import { StatCard } from "~/components/common/StatCard";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import { type Issue, IssueStatus, ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { IssueStatusBadge } from "~/components/issues";

interface UserIssueListItem {
    issue: Issue;
    orderId: string;
    productName: string;
}

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
    const [issues, setIssues] = useState<UserIssueListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadIssues = async () => {
            setLoading(true);
            setError(null);

            try {
                const orders = await orderService.getMyOrders();
                const issuesByOrder = await Promise.all(
                    orders.map(async (order) => {
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

                const mappedIssues: UserIssueListItem[] = issuesByOrder.flatMap(({ order, orderIssues }) => {
                    return orderIssues.map((issue) => ({
                        issue,
                        orderId: order.id,
                        productName: resolveProductName(order, issue),
                    }));
                });

                setIssues(mappedIssues);
            } catch (err) {
                setError(getErrorMessage(err, "Error al cargar las incidencias"));
            } finally {
                setLoading(false);
            }
        };

        loadIssues();
    }, []);

    const rows = useMemo<UserIssueRow[]>(() => {
        return issues
            .map(({ issue, orderId, productName }) => ({
                id: issue.id,
                title: issue.title,
                description: issue.description,
                status: issue.status,
                orderId,
                productName,
                createdAt: issue.createdAt,
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

    const columns = useMemo<FilterableColumn<UserIssueRow>[]>(
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

            {loading && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <LoadingSpinner size="lg" message="Cargando incidencias..." />
                </div>
            )}

            {error && (
                <ErrorMessage message={error} />
            )}

            {!loading && !error && issues.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No tienes incidencias</h2>
                    <p className="text-gray-600">Cuando reportes una incidencia en un pedido, aparecerá aquí.</p>
                </div>
            )}

            {!loading && !error && issues.length > 0 && (
                <FilterableTable<UserIssueRow>
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


