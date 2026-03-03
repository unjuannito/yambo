import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faChartLine,
    faShoppingCart,
    faUsers,
    faExclamationTriangle,
    faMoneyBillWave,
    faClock,
} from "@fortawesome/free-solid-svg-icons";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Tooltip,
    Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import type { ReportSummary, TimeSeriesPoint, TimeSeriesDecimalPoint } from "~/types/report";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Tooltip,
    Filler
);

// ─── Sparkline – tiny embedded line chart ──────────────────────────────

function Sparkline({
    data,
    color,
}: {
    data: (TimeSeriesPoint | TimeSeriesDecimalPoint)[];
    color: string;
}) {
    if (data.length < 2) return null;

    const chartData = {
        labels: data.map((d) => d.date),
        datasets: [
            {
                data: data.map((d) => d.value),
                borderColor: color,
                backgroundColor: color + "18",
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: { display: false, beginAtZero: true },
        },
    };

    return (
        <div className="h-12 w-full">
            <Line data={chartData} options={options} />
        </div>
    );
}

// ─── Mini Doughnut ─────────────────────────────────────────────────────

const ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING_PAYMENT: "#f39c12",
    CONFIRMING_PAYMENT: "#e67e22",
    PAYMENT_CONFIRMED: "#27ae60",
    PENDING_PRODUCTS: "#3498db",
    CLOSED: "#16a085",
    CANCELED: "#e74c3c",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
    PENDING_PAYMENT: "Pte. Pago",
    CONFIRMING_PAYMENT: "Confirmando",
    PAYMENT_CONFIRMED: "Confirmado",
    PENDING_PRODUCTS: "Pte. Prod.",
    CLOSED: "Cerrado",
    CANCELED: "Cancelado",
};

function MiniDoughnut({ data }: { data: Record<string, number> }) {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    const chartData = {
        labels: keys.map((k) => ORDER_STATUS_LABELS[k] || k),
        datasets: [
            {
                data: Object.values(data),
                backgroundColor: keys.map(
                    (k) => ORDER_STATUS_COLORS[k] || "#6b7280"
                ),
                borderWidth: 1,
                borderColor: "#ffffff",
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: "right" as const,
                labels: { boxWidth: 8, padding: 6, font: { size: 11 }, usePointStyle: true },
            },
            tooltip: { enabled: true },
        },
        cutout: "55%",
    };

    return (
        <div className="h-40">
            <Doughnut data={chartData} options={options} />
        </div>
    );
}

// ─── Stat Tile ─────────────────────────────────────────────────────────

function StatTile({
    label,
    value,
    icon,
    color,
    sparklineData,
    sparklineColor,
}: {
    label: string;
    value: string | number;
    icon: typeof faChartLine;
    color: string;
    sparklineData?: (TimeSeriesPoint | TimeSeriesDecimalPoint)[];
    sparklineColor?: string;
}) {
    const bgMap: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        yellow: "bg-yellow-50 text-yellow-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
        indigo: "bg-indigo-50 text-indigo-600",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgMap[color] || bgMap.blue}`}
                >
                    <FontAwesomeIcon icon={icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 truncate">{label}</p>
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
            </div>
            {sparklineData && sparklineData.length >= 2 && (
                <Sparkline data={sparklineData} color={sparklineColor || "#3b82f6"} />
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────

interface ReportSnapshotProps {
    data: ReportSummary;
}

export default function ReportSnapshot({ data }: ReportSnapshotProps) {
    const { orders, users, issues } = data;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-indigo-500" />
                    Resumen últimos 30 días
                </h3>
                <Link
                    to="/mi-espacio/admin/informes"
                    className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                    Ver informes completos
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatTile
                    label="Pedidos"
                    value={orders.totalOrders}
                    icon={faShoppingCart}
                    color="blue"
                    sparklineData={orders.ordersOverTime}
                    sparklineColor="#3b82f6"
                />
                <StatTile
                    label="Ingresos"
                    value={`${orders.totalRevenue.toFixed(0)} €`}
                    icon={faMoneyBillWave}
                    color="green"
                    sparklineData={orders.revenueOverTime}
                    sparklineColor="#10b981"
                />
                <StatTile
                    label="Usuarios"
                    value={users.totalUsers}
                    icon={faUsers}
                    color="purple"
                />
                <StatTile
                    label="Usr. Activos"
                    value={users.activeUsers}
                    icon={faUsers}
                    color="indigo"
                    sparklineData={users.activeUsersOverTime}
                    sparklineColor="#6366f1"
                />
                <StatTile
                    label="Incidencias"
                    value={issues.totalIssues}
                    icon={faExclamationTriangle}
                    color="yellow"
                    sparklineData={issues.issuesOverTime}
                    sparklineColor="#f59e0b"
                />
                <StatTile
                    label="Tiempo Resol."
                    value={issues.averageResolutionHours != null ? `${issues.averageResolutionHours}h` : "N/A"}
                    icon={faClock}
                    color="red"
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Orders over time */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Pedidos (tendencia)
                    </h4>
                    {orders.ordersOverTime.length > 1 ? (
                        <SparklineChart
                            data={orders.ordersOverTime}
                            label="Pedidos"
                            color="#3b82f6"
                        />
                    ) : (
                        <p className="text-gray-400 text-xs text-center py-8">
                            Sin datos suficientes
                        </p>
                    )}
                </div>

                {/* Orders by status */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Pedidos por estado
                    </h4>
                    {Object.keys(orders.ordersByStatus).length > 0 ? (
                        <MiniDoughnut data={orders.ordersByStatus} />
                    ) : (
                        <p className="text-gray-400 text-xs text-center py-8">
                            Sin datos
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sparkline Chart – slightly larger than the tile version ───────────

function SparklineChart({
    data,
    label,
    color,
}: {
    data: (TimeSeriesPoint | TimeSeriesDecimalPoint)[];
    label: string;
    color: string;
}) {
    function formatDateLabel(dateStr: string): string {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
    }

    const chartData = {
        labels: data.map((d) => formatDateLabel(d.date)),
        datasets: [
            {
                label,
                data: data.map((d) => d.value),
                borderColor: color,
                backgroundColor: color + "18",
                fill: true,
                tension: 0.3,
                pointRadius: data.length > 20 ? 0 : 2,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items: any[]) => {
                        const idx = items[0]?.dataIndex;
                        if (idx !== undefined) {
                            return new Date(data[idx].date + "T00:00:00").toLocaleDateString(
                                "es-ES",
                                { day: "numeric", month: "long" }
                            );
                        }
                        return "";
                    },
                },
            },
        },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
            x: { ticks: { maxTicksLimit: 7, font: { size: 10 } } },
        },
    };

    return (
        <div className="h-40">
            <Line data={chartData} options={options} />
        </div>
    );
}
