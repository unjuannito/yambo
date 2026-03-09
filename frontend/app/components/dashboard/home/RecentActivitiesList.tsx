import React from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import type { Activity } from "~/types/activity";

interface RecentActivitiesListProps {
    activities: Activity[];
}

const STATUS_COLORS: Record<string, string> = {
    PLANNED: "bg-blue-100 text-blue-800",
    OPEN_REGISTRATION: "bg-green-100 text-green-800",
    REGISTRATION_CLOSED: "bg-yellow-100 text-yellow-800",
    CLOSED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
};

function formatDate(dateString: string | null): string {
    if (!dateString) return "Sin fecha";
    return new Date(dateString).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

const ActivityRow = React.memo(function ActivityRow({ activity }: { activity: Activity }) {
    const statusValue = activity.status?.value ?? "";
    const statusLabel = activity.status?.label ?? statusValue;
    const colorClass =
        STATUS_COLORS[statusValue] ?? "bg-gray-100 text-gray-800";

    return (
        <div
            className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors"
        >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
                <FontAwesomeIcon
                    icon={faCalendarDays}
                    className="w-4 h-4"
                />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDate(activity.date)}</span>
                    {activity.project && (
                        <>
                            <span>·</span>
                            <span className="truncate">
                                {activity.project.name}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${colorClass}`}
            >
                {statusLabel}
            </span>
        </div>
    );
});

export default function RecentActivitiesList({
    activities,
}: RecentActivitiesListProps) {
    if (activities.length === 0) {
        return (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                    Actividades recientes
                </h2>
                <p className="text-gray-500 text-sm">No hay actividades recientes.</p>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-semibold text-gray-700">
                    Actividades recientes
                </h2>
                <Link
                    to="/mi-espacio/actividades"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                    Ver todas
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-gray-100">
                {activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                ))}
            </div>
        </section>
    );
}
