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
    faCubes,
    faBoxOpen,
    faEye,
    faLayerGroup,
    faFunnelDollar,
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

const ORDER_PRODUCT_STATUS_LABELS: Record<string, string> = {
    OPEN: "Abierto",
    ORDER_CLOSED: "Pedido Cerrado",
    PENDING_FABRICATION: "Pte. Fabricación",
    TO_BE_DELIVERED: "Por Entregar",
    DELIVERED: "Entregado",
    CANCELED: "Cancelado",
};

const ORDER_PRODUCT_STATUS_COLORS: Record<string, string> = {
    OPEN: "#3498db",
    ORDER_CLOSED: "#16a085",
    PENDING_FABRICATION: "#e67e22",
    TO_BE_DELIVERED: "#f39c12",
    DELIVERED: "#27ae60",
    CANCELED: "#e74c3c",
};

const TOP_PRODUCT_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

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

                    {/* ── Product Analytics Section ──────────────────── */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FontAwesomeIcon
                                icon={faCubes}
                                className="text-indigo-500"
                            />
                            Productos
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricCard
                                title="Productos Vendidos"
                                value={data.products.totalProductsSold}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faCubes}
                                        className="w-5 h-5"
                                    />
                                }
                                color="blue"
                            />
                            <MetricCard
                                title="Productos Únicos"
                                value={data.products.uniqueProductsSold}
                                subtitle="Productos diferentes vendidos"
                                icon={
                                    <FontAwesomeIcon
                                        icon={faBoxOpen}
                                        className="w-5 h-5"
                                    />
                                }
                                color="purple"
                            />
                            <MetricCard
                                title="Ingresos Productos"
                                value={`${data.products.totalProductRevenue.toFixed(2)} €`}
                                icon={
                                    <FontAwesomeIcon
                                        icon={faMoneyBillWave}
                                        className="w-5 h-5"
                                    />
                                }
                                color="green"
                            />
                            <MetricCard
                                title="Vistas Totales"
                                value={
                                    data.products.totalViews != null
                                        ? data.products.totalViews
                                        : "N/A"
                                }
                                subtitle="Visitas a páginas de producto"
                                icon={
                                    <FontAwesomeIcon
                                        icon={faEye}
                                        className="w-5 h-5"
                                    />
                                }
                                color="yellow"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <ChartCard title="Ventas de productos a lo largo del tiempo">
                                {data.products.productSalesOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={data.products.productSalesOverTime}
                                        label="Unidades vendidas"
                                        color="#6366f1"
                                        fillColor="rgba(99, 102, 241, 0.1)"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Ingresos de productos a lo largo del tiempo">
                                {data.products.productRevenueOverTime.length > 0 ? (
                                    <ReportLineChart
                                        data={data.products.productRevenueOverTime}
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
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <ChartCard title="Top 10 productos más vendidos">
                                {data.products.topProductsByQuantity.length > 0 ? (
                                    <ReportBarChart
                                        labels={data.products.topProductsByQuantity.map(
                                            (p) => p.productName
                                        )}
                                        values={data.products.topProductsByQuantity.map(
                                            (p) => p.quantity
                                        )}
                                        colors={data.products.topProductsByQuantity.map(
                                            (_, i) => TOP_PRODUCT_COLORS[i % TOP_PRODUCT_COLORS.length]
                                        )}
                                        label="Unidades vendidas"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Top 10 productos por ingresos">
                                {data.products.topProductsByRevenue.length > 0 ? (
                                    <ReportBarChart
                                        labels={data.products.topProductsByRevenue.map(
                                            (p) => p.productName
                                        )}
                                        values={data.products.topProductsByRevenue.map(
                                            (p) => p.revenue
                                        )}
                                        colors={data.products.topProductsByRevenue.map(
                                            (_, i) => TOP_PRODUCT_COLORS[i % TOP_PRODUCT_COLORS.length]
                                        )}
                                        label="Ingresos (€)"
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <ChartCard title="Ventas por familia de producto">
                                {data.products.salesByFamily.length > 0 ? (
                                    <ReportDoughnutChart
                                        labels={data.products.salesByFamily.map(
                                            (f) => f.familyName
                                        )}
                                        values={data.products.salesByFamily.map(
                                            (f) => f.revenue
                                        )}
                                        colors={data.products.salesByFamily.map(
                                            (_, i) => TOP_PRODUCT_COLORS[i % TOP_PRODUCT_COLORS.length]
                                        )}
                                    />
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-12">
                                        Sin datos en este periodo
                                    </p>
                                )}
                            </ChartCard>
                            <ChartCard title="Productos por estado">
                                {Object.keys(data.products.productsByStatus)
                                    .length > 0 ? (
                                    <ReportDoughnutChart
                                        labels={Object.keys(
                                            data.products.productsByStatus
                                        ).map(
                                            (s) =>
                                                ORDER_PRODUCT_STATUS_LABELS[s] || s
                                        )}
                                        values={Object.values(
                                            data.products.productsByStatus
                                        )}
                                        colors={Object.keys(
                                            data.products.productsByStatus
                                        ).map(
                                            (s) =>
                                                ORDER_PRODUCT_STATUS_COLORS[s] ||
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

                        {/* Conversion Funnel (only if view data exists) */}
                        {data.products.conversionFunnel &&
                            data.products.conversionFunnel.length > 0 && (
                            <div className="mb-6">
                                <ChartCard
                                    title="Embudo de conversión"
                                    subtitle="Vistas → Compras por producto"
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-2 px-3 text-gray-600 font-medium">
                                                        Producto
                                                    </th>
                                                    <th className="text-right py-2 px-3 text-gray-600 font-medium">
                                                        Vistas
                                                    </th>
                                                    <th className="text-right py-2 px-3 text-gray-600 font-medium">
                                                        Compras
                                                    </th>
                                                    <th className="text-right py-2 px-3 text-gray-600 font-medium">
                                                        Conversión
                                                    </th>
                                                    <th className="py-2 px-3 w-40">
                                                        &nbsp;
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.products.conversionFunnel.map(
                                                    (item) => (
                                                        <tr
                                                            key={item.productId}
                                                            className="border-b border-gray-100 hover:bg-gray-50"
                                                        >
                                                            <td className="py-2 px-3 text-gray-900 font-medium">
                                                                {item.productName}
                                                            </td>
                                                            <td className="py-2 px-3 text-right text-gray-600">
                                                                {item.views}
                                                            </td>
                                                            <td className="py-2 px-3 text-right text-gray-600">
                                                                {item.purchases}
                                                            </td>
                                                            <td className="py-2 px-3 text-right">
                                                                <span
                                                                    className={`font-semibold ${
                                                                        item.conversionRate >= 10
                                                                            ? "text-green-600"
                                                                            : item.conversionRate >= 3
                                                                              ? "text-yellow-600"
                                                                              : "text-red-500"
                                                                    }`}
                                                                >
                                                                    {item.conversionRate}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className={`h-2 rounded-full ${
                                                                            item.conversionRate >= 10
                                                                                ? "bg-green-500"
                                                                                : item.conversionRate >= 3
                                                                                  ? "bg-yellow-500"
                                                                                  : "bg-red-400"
                                                                        }`}
                                                                        style={{
                                                                            width: `${Math.min(item.conversionRate, 100)}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </ChartCard>
                            </div>
                        )}

                        {/* Family breakdown table */}
                        {data.products.salesByFamily.length > 0 && (
                            <ChartCard
                                title="Desglose por familia de producto"
                                subtitle="Cantidad y revenue por drop/familia"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 px-3 text-gray-600 font-medium">
                                                    Familia
                                                </th>
                                                <th className="text-right py-2 px-3 text-gray-600 font-medium">
                                                    Unidades
                                                </th>
                                                <th className="text-right py-2 px-3 text-gray-600 font-medium">
                                                    Ingresos
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.products.salesByFamily.map(
                                                (fam) => (
                                                    <tr
                                                        key={fam.familyId}
                                                        className="border-b border-gray-100 hover:bg-gray-50"
                                                    >
                                                        <td className="py-2 px-3 text-gray-900 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <FontAwesomeIcon
                                                                    icon={faLayerGroup}
                                                                    className="w-3 h-3 text-indigo-400"
                                                                />
                                                                {fam.familyName}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-gray-600">
                                                            {fam.quantity}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-gray-600">
                                                            {fam.revenue.toFixed(2)} €
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </ChartCard>
                        )}
                    </section>
                </div>
            ) : null}
        </main>
    );
}
