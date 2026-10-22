import { useTranslation } from "react-i18next";
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
    faCubes,
} from "@fortawesome/free-solid-svg-icons";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    BarElement,
    Tooltip,
    Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import type { ReportSummary, TimeSeriesPoint, TimeSeriesDecimalPoint } from "~/types/report";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    BarElement,
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
    PAYMENT_CONFIRMED: "#33a35e",
    PENDING_PRODUCTS: "#906bac",
    CLOSED: "#16a085",
    CANCELED: "#ff6b6b",
};

function MiniDoughnut({ data, t }: { data: Record<string, number>; t: (key: string) => string }) {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    const chartData = {
        labels: keys.map((k) => {
            const statusLabels: Record<string, string> = {
                PENDING_PAYMENT: t("report.statusPendingPayment"),
                CONFIRMING_PAYMENT: t("report.statusConfirmingPayment"),
                PAYMENT_CONFIRMED: t("report.statusPaymentConfirmed"),
                PENDING_PRODUCTS: t("report.statusPendingProducts"),
                CLOSED: t("report.statusClosed"),
                CANCELED: t("report.statusCanceled"),
            };
            return statusLabels[k] || k;
        }),
        datasets: [
            {
                data: Object.values(data),
                backgroundColor: keys.map(
                    (k) => ORDER_STATUS_COLORS[k] || "#6b7280"
                ),
                borderWidth: 2,
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
        cutout: "60%",
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
        green: "bg-yambo-green-50 text-yambo-green-600",
        yellow: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-yambo-purple-50 text-yambo-purple-600",
        indigo: "bg-indigo-50 text-indigo-600",
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgMap[color] || bgMap.green}`}
                >
                    <FontAwesomeIcon icon={icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 truncate">{label}</p>
                    <p className="text-lg font-bold text-yambo-black">{value}</p>
                </div>
            </div>
            {sparklineData && sparklineData.length >= 2 && (
                <Sparkline data={sparklineData} color={sparklineColor || "#33a35e"} />
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────

interface ReportSnapshotProps {
    data: ReportSummary;
}

export default function ReportSnapshot({ data }: ReportSnapshotProps) {
    const { t } = useTranslation();
    const { orders, users, issues, products } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-yambo-black flex items-center gap-2.5">
                    <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-yambo-purple-500" />
                    {t('dashboard.summary30Days')}
                </h3>
                <Link
                    to="/mi-espacio/admin/informes"
                    className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                    {t('dashboard.viewFullReports')}
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                    label={t('dashboard.ordersLabel')}
                    value={orders.totalOrders}
                    icon={faShoppingCart}
                    color="green"
                    sparklineData={orders.ordersOverTime}
                    sparklineColor="#33a35e"
                />
                <StatTile
                    label={t('dashboard.revenueLabel')}
                    value={`${orders.totalRevenue.toFixed(0)} €`}
                    icon={faMoneyBillWave}
                    color="green"
                    sparklineData={orders.revenueOverTime}
                    sparklineColor="#10b981"
                />
                <StatTile
                    label={t('dashboard.usersLabel')}
                    value={users.totalUsers}
                    icon={faUsers}
                    color="purple"
                />
                <StatTile
                    label={t('dashboard.activeUsersLabel')}
                    value={users.activeUsers}
                    icon={faUsers}
                    color="purple"
                    sparklineData={users.activeUsersOverTime}
                    sparklineColor="#906bac"
                />
                <StatTile
                    label={t('dashboard.issuesLabel')}
                    value={issues.totalIssues}
                    icon={faExclamationTriangle}
                    color="yellow"
                    sparklineData={issues.issuesOverTime}
                    sparklineColor="#f59e0b"
                />
                <StatTile
                    label={t('dashboard.resolutionTimeLabel')}
                    value={issues.averageResolutionHours != null ? `${issues.averageResolutionHours}h` : t('common.notAvailable')}
                    icon={faClock}
                    color="red"
                />
                <StatTile
                    label={t('dashboard.productsSoldLabel')}
                    value={products.totalProductsSold}
                    icon={faCubes}
                    color="purple"
                    sparklineData={products.productSalesOverTime}
                    sparklineColor="#906bac"
                />
                <StatTile
                    label={t('dashboard.productRevenueLabel')}
                    value={`${products.totalProductRevenue.toFixed(0)} €`}
                    icon={faMoneyBillWave}
                    color="green"
                    sparklineData={products.productRevenueOverTime}
                    sparklineColor="#33a35e"
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Orders over time */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-yambo-black mb-3">
                        {t('dashboard.ordersTrend')}
                    </h4>
                    {orders.ordersOverTime.length > 1 ? (
                        <SparklineChart
                            data={orders.ordersOverTime}
                            label={t('dashboard.ordersLabel')}
                            color="#33a35e"
                        />
                    ) : (
                        <p className="text-gray-300 text-xs text-center py-8">
                            {t('dashboard.notEnoughData')}
                        </p>
                    )}
                </div>

                {/* Orders by status */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-yambo-black mb-3">
                        {t('dashboard.ordersByStatus')}
                    </h4>
                    {Object.keys(orders.ordersByStatus).length > 0 ? (
                        <MiniDoughnut data={orders.ordersByStatus} t={t} />
                    ) : (
                        <p className="text-gray-300 text-xs text-center py-8">
                            {t('dashboard.noData')}
                        </p>
                    )}
                </div>

                {/* Top products */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-yambo-black mb-3">
                        {t('dashboard.topProducts')}
                    </h4>
                    {products.topProductsByQuantity.length > 0 ? (
                        <MiniBarChart
                            labels={products.topProductsByQuantity.slice(0, 5).map((p) => p.productName)}
                            values={products.topProductsByQuantity.slice(0, 5).map((p) => p.quantity)}
                        />
                    ) : (
                        <p className="text-gray-300 text-xs text-center py-8">
                            {t('dashboard.noData')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Mini Bar Chart ────────────────────────────────────────────────────

const MINI_BAR_COLORS = [
    "#33a35e", "#906bac", "#4ecdc4", "#ff6b6b", "#ffd93d",
];

function MiniBarChart({ labels, values }: { labels: string[]; values: number[] }) {
    if (labels.length === 0) return null;

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor: labels.map((_, i) => MINI_BAR_COLORS[i % MINI_BAR_COLORS.length]),
                borderRadius: 8,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y" as const,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
        scales: {
            x: { display: false, beginAtZero: true },
            y: {
                ticks: { font: { size: 10 }, autoSkip: false },
                grid: { display: false },
            },
        },
    };

    return (
        <div className="h-40">
            <Bar data={chartData} options={options} />
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
