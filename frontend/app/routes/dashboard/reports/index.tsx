import type { Route } from "./+types/index";
import { useReportData } from "~/hooks/useReportData";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChartLine,
    faShoppingCart,
    faUsers,
    faExclamationTriangle,
    faMoneyBillWave,
    faClock,
    faUserPlus,
    faSignInAlt,
    faBullseye,
    faWrench,
} from "@fortawesome/free-solid-svg-icons";
import {
    MetricCard,
    ChartCard,
    DateRangePicker,
    ReportLineChart,
    ReportBarChart,
    ReportDoughnutChart,
} from "~/components/reports/ReportCharts";

// Status label/color maps
const ORDER_STATUS_LABELS: Record<string, string> = {
    PENDING_PAYMENT: "Pendiente de Pago",
    CONFIRMING_PAYMENT: "Confirmando Pago",
    PAYMENT_CONFIRMED: "Pago Confirmado",
    PENDING_PRODUCTS: "Pendiente de Productos",
    CLOSED: "Completado",
    CANCELED: "Cancelado",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING_PAYMENT: "#f39c12",
    CONFIRMING_PAYMENT: "#e67e22",
    PAYMENT_CONFIRMED: "#27ae60",
    PENDING_PRODUCTS: "#3498db",
    CLOSED: "#16a085",
    CANCELED: "#e74c3c",
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
    OPEN: "Abierto",
    IN_PROGRESS: "En Progreso",
    RESOLVED: "Resuelto",
    CLOSED: "Cerrado",
    REOPENED: "Reabierto",
};

const ISSUE_STATUS_COLORS: Record<string, string> = {
    OPEN: "#e67e22",
    IN_PROGRESS: "#3498db",
    RESOLVED: "#27ae60",
    CLOSED: "#6b7280",
    REOPENED: "#7c3aed",
};

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Informes" },
        { name: "description", content: "Informes y analíticas avanzadas" },
    ];
}

export default function ReportsPage() {
    const {
        data,
        loading,
        error,
        refetch,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
    } = useReportData();

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <FontAwesomeIcon
                            icon={faChartLine}
                            className="text-blue-600"
                        />
                        Informes
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Analíticas y métricas de la plataforma
                    </p>
                </div>
            </div>

            <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
            />

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner size="lg" message="Cargando informes..." />
                </div>
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : data ? (
                <div className="mt-8 space-y-10">
                    {/* ── Order Section ──────────────────────────────── */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FontAwesomeIcon
                                icon={faShoppingCart}
                                className="text-blue-500"
                            />
                            Pedidos
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricCard
                                title="Total Pedidos"
                                value={data.orders.totalOrders}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faShoppingCart}
                                        className="w-5 h-5"
                                    />
                                }
                                color="blue"
                            />
                            <MetricCard
                                title="Ingresos Totales"
                                value={`${data.orders.totalRevenue.toFixed(2)} €`}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faMoneyBillWave}
                                        className="w-5 h-5"
                                    />
                                }
                                color="green"
                            />
                            <MetricCard
                                title="Pedido Medio"
                                value={`${data.orders.averageOrderValue.toFixed(2)} €`}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faBullseye}
                                        className="w-5 h-5"
                                    />
                                }
                                color="purple"
                            />
                            <MetricCard
                                title="Tiempo medio entrega"
                                value={
                                    data.orders.averageFulfillmentHours != null
                                        ? `${data.orders.averageFulfillmentHours}h`
                                        : "N/A"
                                }
                                subtitle="Para pedidos cerrados"
                                icon={
                                    <FontAwesomeIcon
                                        icon={faClock}
                                        className="w-5 h-5"
                                    />
                                }
                                color="yellow"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Pedidos a lo largo del tiempo">
                                {data.orders.ordersOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={data.orders.ordersOverTime}
                                        label="Pedidos"
                                        color="#3b82f6"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Ingresos a lo largo del tiempo">
                                {data.orders.revenueOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={data.orders.revenueOverTime}
                                        label="Ingresos (€)"
                                        color="#10b981"
                                        fillColor="rgba(16, 185, 129, 0.1)"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Pedidos por estado">
                                {Object.keys(data.orders.ordersByStatus)
                                    .length > 0 ? (
                                    <ReportDoughnutChart
                                        labels={Object.keys(
                                            data.orders.ordersByStatus
                                        ).map(
                                            (s) =>
                                                ORDER_STATUS_LABELS[s] || s
                                        )}
                                        values={Object.values(
                                            data.orders.ordersByStatus
                                        )}
                                        colors={Object.keys(
                                            data.orders.ordersByStatus
                                        ).map(
                                            (s) =>
                                                ORDER_STATUS_COLORS[s] ||
                                                "#6b7280"
                                        )}
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                        </div>
                    </section>

                    {/* ── User Engagement Section ───────────────────── */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FontAwesomeIcon
                                icon={faUsers}
                                className="text-green-500"
                            />
                            Usuarios
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricCard
                                title="Total Usuarios"
                                value={data.users.totalUsers}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faUsers}
                                        className="w-5 h-5"
                                    />
                                }
                                color="blue"
                            />
                            <MetricCard
                                title="Nuevos Registros"
                                value={data.users.newRegistrations}
                                subtitle="En el periodo seleccionado"
                                icon={
                                    <FontAwesomeIcon
                                        icon={faUserPlus}
                                        className="w-5 h-5"
                                    />
                                }
                                color="green"
                            />
                            <MetricCard
                                title="Usuarios Activos"
                                value={data.users.activeUsers}
                                subtitle={`${data.users.engagementRate}% de engagement`}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faSignInAlt}
                                        className="w-5 h-5"
                                    />
                                }
                                color="purple"
                            />
                            <MetricCard
                                title="Total Logins"
                                value={data.users.totalLogins}
                                subtitle="En el periodo seleccionado"
                                icon={
                                    <FontAwesomeIcon
                                        icon={faSignInAlt}
                                        className="w-5 h-5"
                                    />
                                }
                                color="yellow"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Nuevos registros a lo largo del tiempo">
                                {data.users.registrationsOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={
                                            data.users.registrationsOverTime
                                        }
                                        label="Registros"
                                        color="#10b981"
                                        fillColor="rgba(16, 185, 129, 0.1)"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Usuarios activos por día">
                                {data.users.activeUsersOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={
                                            data.users.activeUsersOverTime
                                        }
                                        label="Usuarios activos"
                                        color="#8b5cf6"
                                        fillColor="rgba(139, 92, 246, 0.1)"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                        </div>
                    </section>

                    {/* ── Issue Metrics Section ─────────────────────── */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FontAwesomeIcon
                                icon={faExclamationTriangle}
                                className="text-yellow-500"
                            />
                            Incidencias
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricCard
                                title="Total Incidencias"
                                value={data.issues.totalIssues}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faExclamationTriangle}
                                        className="w-5 h-5"
                                    />
                                }
                                color="yellow"
                            />
                            <MetricCard
                                title="Abiertas"
                                value={data.issues.openIssues}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faWrench}
                                        className="w-5 h-5"
                                    />
                                }
                                color="red"
                            />
                            <MetricCard
                                title="Resueltas"
                                value={data.issues.closedIssues}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faBullseye}
                                        className="w-5 h-5"
                                    />
                                }
                                color="green"
                            />
                            <MetricCard
                                title="Tiempo medio resolución"
                                value={
                                    data.issues.averageResolutionHours != null
                                        ? `${data.issues.averageResolutionHours}h`
                                        : "N/A"
                                }
                                subtitle="Para incidencias resueltas"
                                icon={
                                    <FontAwesomeIcon
                                        icon={faClock}
                                        className="w-5 h-5"
                                    />
                                }
                                color="purple"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Incidencias a lo largo del tiempo">
                                {data.issues.issuesOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={data.issues.issuesOverTime}
                                        label="Incidencias"
                                        color="#f59e0b"
                                        fillColor="rgba(245, 158, 11, 0.1)"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Incidencias por estado">
                                {Object.keys(data.issues.issuesByStatus)
                                    .length > 0 ? (
                                    <ReportDoughnutChart
                                        labels={Object.keys(
                                            data.issues.issuesByStatus
                                        ).map(
                                            (s) =>
                                                ISSUE_STATUS_LABELS[s] || s
                                        )}
                                        values={Object.values(
                                            data.issues.issuesByStatus
                                        )}
                                        colors={Object.keys(
                                            data.issues.issuesByStatus
                                        ).map(
                                            (s) =>
                                                ISSUE_STATUS_COLORS[s] ||
                                                "#6b7280"
                                        )}
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                        </div>
                    </section>
                </div>
            ) : null}
        </main>
    );
}
