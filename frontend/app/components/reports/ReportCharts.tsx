import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import type { TimeSeriesPoint, TimeSeriesDecimalPoint } from "~/types/report";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

// ─── Line Chart ─────────────────────────────────────────────────────────

interface LineChartProps {
    data: TimeSeriesPoint[] | TimeSeriesDecimalPoint[];
    label: string;
    color?: string;
    fillColor?: string;
}

export function ReportLineChart({
    data,
    label,
    color = "#3b82f6",
    fillColor = "rgba(59, 130, 246, 0.1)",
}: LineChartProps) {
    const chartData = {
        labels: data.map((d) => formatDateLabel(d.date)),
        datasets: [
            {
                label,
                data: data.map((d) => d.value),
                borderColor: color,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.3,
                pointRadius: data.length > 30 ? 0 : 3,
                pointHoverRadius: 5,
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
                        if (idx !== undefined && data[idx]) {
                            return new Date(
                                data[idx].date + "T00:00:00"
                            ).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            });
                        }
                        return "";
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
            },
            x: {
                ticks: {
                    maxTicksLimit: 10,
                },
            },
        },
    };

    return (
        <div className="h-64">
            <Line data={chartData} options={options} />
        </div>
    );
}

// ─── Bar Chart ──────────────────────────────────────────────────────────

interface BarChartProps {
    labels: string[];
    values: number[];
    colors?: string[];
    label: string;
}

export function ReportBarChart({
    labels,
    values,
    colors,
    label,
}: BarChartProps) {
    const defaultColors = [
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#6b7280",
    ];

    const chartData = {
        labels,
        datasets: [
            {
                label,
                data: values,
                backgroundColor:
                    colors || labels.map((_, i) => defaultColors[i % defaultColors.length]),
                borderRadius: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
            },
        },
    };

    return (
        <div className="h-64">
            <Bar data={chartData} options={options} />
        </div>
    );
}

// ─── Doughnut Chart ─────────────────────────────────────────────────────

interface DoughnutChartProps {
    labels: string[];
    values: number[];
    colors?: string[];
}

export function ReportDoughnutChart({
    labels,
    values,
    colors,
}: DoughnutChartProps) {
    const defaultColors = [
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#6b7280",
    ];

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor:
                    colors || labels.map((_, i) => defaultColors[i % defaultColors.length]),
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
                position: "bottom" as const,
                labels: {
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: "circle",
                },
            },
        },
    };

    return (
        <div className="h-64">
            <Doughnut data={chartData} options={options} />
        </div>
    );
}

// ─── Metric Card ────────────────────────────────────────────────────────

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    color?: string;
}

export function MetricCard({
    title,
    value,
    subtitle,
    icon,
    color = "blue",
}: MetricCardProps) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        yellow: "bg-yellow-50 text-yellow-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
        gray: "bg-gray-50 text-gray-600",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            {icon && (
                <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}
                >
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 truncate">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                {subtitle && (
                    <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

// ─── Chart Card wrapper ─────────────────────────────────────────────────

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── Date Range Picker ──────────────────────────────────────────────────

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}

export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}: DateRangePickerProps) {
    const presets = [
        { label: "7 días", days: 7 },
        { label: "30 días", days: 30 },
        { label: "90 días", days: 90 },
        { label: "1 año", days: 365 },
    ];

    const applyPreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        onStartDateChange(start.toISOString().split("T")[0]);
        onEndDateChange(end.toISOString().split("T")[0]);
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Desde</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Hasta</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="flex gap-1.5">
                {presets.map((preset) => (
                    <button
                        key={preset.days}
                        onClick={() => applyPreset(preset.days)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
