import React from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import type { Activity } from "~/types/activity";

interface RecentActivitiesListProps {
    activities: Activity[];
}

const STATUS_COLORS: Record<string, string> = {
    PLANNED: "bg-blue-100 text-blue-700",
    OPEN_REGISTRATION: "bg-yambo-green-100 text-yambo-green-700",
    REGISTRATION_CLOSED: "bg-amber-100 text-amber-700",
    CLOSED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-700",
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
        STATUS_COLORS[statusValue] ?? "bg-gray-100 text-gray-600";

    return (
        <div className="flex items-center gap-4 px-6 py-4 hover:bg-yambo-green-50/30 transition-colors rounded-xl mx-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 flex-shrink-0">
                <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yambo-black truncate">
                    {activity.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
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
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${colorClass}`}
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
            <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                    Actividades recientes
                </h2>
                <p className="text-gray-400 text-sm">No hay actividades recientes.</p>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <h2 className="text-lg font-bold font-display text-yambo-black">
                    Actividades recientes
                </h2>
                <Link
                    to="/mi-espacio/actividades"
                    className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                    Ver todas
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-gray-50 pb-2">
                {activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                ))}
            </div>
        </section>
    );
}
