import { useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { getPublicActivities } from "~/services/publicService.server";
import type { Activity } from "~/types/activity";
import { ActivityStatus } from "~/types/activity";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faList,
    faChevronLeft,
    faChevronRight,
    faMapPin,
    faUserTie,
    faClock,
    faMoon,
    faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { getSiteUrl } from "~/utils/env.server";
import { collectionPageJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import type { Route } from "./+types/actividades";
import toast from "react-hot-toast";
import { fireEmojiRain } from "~/utils/confetti";

export function meta({ data }: Route.MetaArgs) {
    const siteUrl = data?.siteUrl ?? "";
    const title = "Yambo - Actividades | Asociación Juvenil en Alcobendas";
    const description = "Consulta las próximas actividades de Yambo en Alcobendas (Madrid). Eventos de ocio educativo y tiempo libre para niños y adolescentes.";

    return [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: "actividades juveniles, Yambo, Alcobendas, Madrid, eventos, ocio educativo, tiempo libre, niños, adolescentes" },
        { tagName: "link", rel: "canonical", href: `${siteUrl}/actividades` },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${siteUrl}/actividades` },
        { property: "og:type", content: "website" },
        { name: "robots", content: "index, follow" },
        { "script:ld+json": collectionPageJsonLd({ name: title, description, url: `${siteUrl}/actividades` }) },
        { "script:ld+json": breadcrumbJsonLd([
            { name: "Inicio", url: siteUrl },
            { name: "Actividades", url: `${siteUrl}/actividades` },
        ]) },
    ];
}

// ── Helpers ─────────────────────────────────────────────────────────────

const UPCOMING_STATUSES = new Set([
    ActivityStatus.PLANNED,
    ActivityStatus.OPEN_REGISTRATION,
    ActivityStatus.REGISTRATION_CLOSED,
]);

function stripMarkdown(md: string): string {
    return md
        .replace(/[#*_~`>\[\]()!|-]/g, "")
        .replace(/\n+/g, " ")
        .trim();
}

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatDateRange(activity: Activity) {
    if (!activity.date) return null;
    const start = new Date(activity.date);
    const startStr = start.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    const startTime = start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    if (!activity.endDate) {
        return { label: `${startStr} · ${startTime}`, nights: 0 };
    }

    const end = new Date(activity.endDate);
    const endStr = end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    const diffMs = end.getTime() - start.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return {
        label: `${formatDateShort(activity.date)} – ${endStr}`,
        nights,
    };
}

function getActivityDays(activity: Activity): Date[] {
    if (!activity.date) return [];
    const start = new Date(activity.date);
    if (!activity.endDate) return [start];
    const end = new Date(activity.endDate);
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

// ── Calendar helpers ────────────────────────────────────────────────────

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

function isSameDay(d1: Date, d2: Date) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function isDateInRange(date: Date, activity: Activity) {
    if (!activity.date) return false;
    const start = new Date(activity.date);
    start.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    if (!activity.endDate) return isSameDay(check, start);
    const end = new Date(activity.endDate);
    end.setHours(23, 59, 59, 999);
    return check >= start && check <= end;
}

// ── Skeleton ────────────────────────────────────────────────────────────

function ActivityCardSkeleton() {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="h-1.5 bg-gray-200" />
            <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-gray-200 rounded-full w-28" />
                    <div className="h-4 bg-gray-100 rounded-full w-32" />
                </div>
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded-lg w-1/3 mb-4" />
                <div className="space-y-2 mb-4">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-full" />
                    <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
            </div>
        </div>
    );
}

// ── Mini calendar ───────────────────────────────────────────────────────

function ActivityCalendar({
    activities,
    onSelectDate,
    selectedDate,
}: {
    activities: Activity[];
    onSelectDate: (date: Date | null) => void;
    selectedDate: Date | null;
}) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [todayGlow, setTodayGlow] = useState(false);

    const todayClicksRef = useRef(0);
    const todayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);

    const activityMap = useMemo(() => {
        const map = new Map<string, Activity[]>();
        for (const a of activities) {
            const days = getActivityDays(a);
            for (const d of days) {
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!map.has(key)) map.set(key, []);
                const existing = map.get(key)!;
                if (!existing.some(e => e.id === a.id)) existing.push(a);
            }
        }
        return map;
    }, [activities]);

    const prev = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const next = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={prev} className="p-2 rounded-xl hover:bg-yambo-green-50 transition text-gray-500 hover:text-yambo-green-600">
                    <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-bold text-yambo-black font-display">
                    {MONTH_NAMES[month]} {year}
                </h3>
                <button onClick={next} className="p-2 rounded-xl hover:bg-yambo-green-50 transition text-gray-500 hover:text-yambo-green-600">
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                    if (day === null) return <div key={`empty-${i}`} />;
                    const cellDate = new Date(year, month, day);
                    const key = `${year}-${month}-${day}`;
                    const dayActivities = activityMap.get(key) || [];
                    const hasActivities = dayActivities.length > 0;
                    const isToday = isSameDay(cellDate, today);
                    const isSelected = selectedDate && isSameDay(cellDate, selectedDate);

                    return (
                        <button
                            key={key}
                            onClick={() => {
                                if (isToday) {
                                    todayClicksRef.current++;
                                    if (todayTimerRef.current) clearTimeout(todayTimerRef.current);
                                    todayTimerRef.current = setTimeout(() => {
                                        todayClicksRef.current = 0;
                                    }, 600);
                                    if (todayClicksRef.current >= 3) {
                                        todayClicksRef.current = 0;
                                        setTodayGlow(true);
                                        fireEmojiRain("🎊");
                                        toast("🎊 ¡Hoy es un gran día para hacer algo increíble!", {
                                            duration: 3000,
                                            style: { background: "#33a35e", color: "white", fontWeight: 600, borderRadius: "9999px" },
                                        });
                                        setTimeout(() => setTodayGlow(false), 3000);
                                    }
                                }
                                if (isSelected) onSelectDate(null);
                                else onSelectDate(cellDate);
                            }}
                            className={`
                                relative flex flex-col items-center justify-center
                                h-10 rounded-xl text-sm transition-all
                                ${isSelected
                                    ? "bg-gradient-to-br from-yambo-green-500 to-yambo-green-600 text-white font-bold shadow-md"
                                    : isToday
                                        ? `bg-yambo-green-50 text-yambo-green-700 font-semibold ring-1 ring-yambo-green-300 ${todayGlow ? "ee-pulse-glow" : ""}`
                                        : hasActivities
                                            ? "hover:bg-yambo-green-50 text-yambo-black font-medium"
                                            : "text-gray-400 hover:bg-gray-50"
                                }
                            `}
                        >
                            {day}
                            {hasActivities && (
                                <span className={`absolute bottom-1 flex gap-0.5`}>
                                    {dayActivities.slice(0, 3).map((a, idx) => (
                                        <span
                                            key={idx}
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ backgroundColor: isSelected ? "white" : (a.status?.color || "#33a35e") }}
                                        />
                                    ))}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {selectedDate && (
                <button
                    onClick={() => onSelectDate(null)}
                    className="mt-3 text-xs text-yambo-green-600 hover:underline w-full text-center font-medium"
                >
                    Mostrar todas las actividades
                </button>
            )}
        </div>
    );
}

// ── Activity card ───────────────────────────────────────────────────────

function ActivityCard({ activity, expanded, onToggle }: { activity: Activity; expanded: boolean; onToggle: () => void }) {
    const dateRange = formatDateRange(activity);
    const descriptionPreview = activity.description
        ? stripMarkdown(activity.description).slice(0, 140)
        : null;
    const hasMore = activity.description && stripMarkdown(activity.description).length > 140;

    return (
        <article
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer hover-lift group"
            onClick={onToggle}
        >
            {/* Color accent bar */}
            <div
                className="h-2"
                style={{ backgroundColor: activity.status?.color || "#e5e7eb" }}
            />

            <div className="p-5 sm:p-6">
                {/* Top row: status + date */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    {activity.status && (
                        <span
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white tracking-wide uppercase"
                            style={{ backgroundColor: activity.status.color }}
                        >
                            {activity.status.label}
                        </span>
                    )}
                    {dateRange && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                            {dateRange.label}
                            {dateRange.nights > 0 && (
                                <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 bg-yambo-purple-50 text-yambo-purple-600 rounded-full text-xs font-semibold">
                                    <FontAwesomeIcon icon={faMoon} className="w-2.5 h-2.5" />
                                    {dateRange.nights} noche{dateRange.nights !== 1 ? "s" : ""}
                                </span>
                            )}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-yambo-black mb-2 group-hover:text-yambo-green-700 transition-colors">
                    {activity.name}
                </h3>

                {/* Project */}
                {activity.project && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                        <FontAwesomeIcon icon={faMapPin} className="w-3 h-3 text-yambo-green-400" />
                        {activity.project.name}
                    </p>
                )}

                {/* Description preview */}
                {!expanded && descriptionPreview && (
                    <p className="text-sm text-gray-500 mb-3 leading-relaxed line-clamp-2">
                        {descriptionPreview}{hasMore ? "…" : ""}
                    </p>
                )}

                {/* Expanded description */}
                {expanded && activity.description && (
                    <div className="mb-4 pt-2 border-t border-gray-100">
                        <MarkdownEditor value={activity.description} readOnly />
                    </div>
                )}

                {/* Footer: manager + expand hint */}
                <div className="flex items-center justify-between mt-2">
                    {activity.manager ? (
                        <div className="flex items-center gap-2">
                            {activity.manager.photo ? (
                                <img
                                    src={activity.manager.photo}
                                    alt={activity.manager.name}
                                    className="h-8 w-8 rounded-full object-cover ring-2 ring-yambo-green-100 shadow-sm"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yambo-green-200 to-yambo-purple-200 flex items-center justify-center text-xs font-bold text-yambo-black ring-2 ring-white shadow-sm">
                                    {activity.manager.name.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                                <FontAwesomeIcon icon={faUserTie} className="w-3 h-3 text-gray-400" />
                                {activity.manager.name}
                            </span>
                        </div>
                    ) : <div />}

                    {activity.description && (
                        <span className="flex items-center gap-1 text-xs text-yambo-green-600 font-medium">
                            {expanded ? "Cerrar" : "Ver más"}
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                className={`w-3 h-3 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                            />
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}

// ── Section component ───────────────────────────────────────────────────

function ActivitySection({
    title,
    activities,
    expandedId,
    onToggle,
    defaultCollapsed = false,
}: {
    title: string;
    activities: Activity[];
    expandedId: string | null;
    onToggle: (id: string) => void;
    defaultCollapsed?: boolean;
}) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    if (activities.length === 0) return null;

    return (
        <div className="fade-up">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-3 mb-4 group/section w-full text-left"
            >
                <h2 className="text-2xl font-bold text-yambo-black font-display">
                    {title}
                </h2>
                <span className="text-sm text-gray-400 font-medium bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {activities.length}
                </span>
                <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
                />
            </button>
            {!collapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger mb-10">
                    {activities.map((a) => (
                        <ActivityCard
                            key={a.id}
                            activity={a}
                            expanded={expandedId === a.id}
                            onToggle={() => onToggle(a.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main page ───────────────────────────────────────────────────────────

type ViewMode = "list" | "calendar";

export async function loader() {
    const activities = await getPublicActivities();
    return { activities, siteUrl: getSiteUrl() };
}

export default function PublicActivities() {
    const { activities } = useLoaderData<typeof loader>();
    const [view, setView] = useState<ViewMode>("list");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpanded = (id: string) => setExpandedId(expandedId === id ? null : id);

    const filteredActivities = useMemo(() => {
        if (!selectedDate) return activities;
        return activities.filter((a) => isDateInRange(selectedDate, a));
    }, [activities, selectedDate]);

    const sortedActivities = useMemo(() => {
        return [...filteredActivities].sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    }, [filteredActivities]);

    const { upcoming, past } = useMemo(() => {
        const upcoming: Activity[] = [];
        const past: Activity[] = [];
        for (const a of sortedActivities) {
            if (a.status && UPCOMING_STATUSES.has(a.status.value as ActivityStatus)) {
                upcoming.push(a);
            } else {
                past.push(a);
            }
        }
        return { upcoming, past };
    }, [sortedActivities]);

    return (
        <section className="w-full bg-gradient-to-b from-yambo-green-50/30 to-yambo-white min-h-screen pt-24 pb-16">
            <div className="max-w-6xl mx-auto px-4">
                <div className="fade-up">
                    <h1 className="text-4xl font-extrabold text-yambo-black mb-2 font-display">Actividades</h1>
                    <p className="text-gray-500 mb-10">
                        Descubre las actividades abiertas al público 🎉
                    </p>
                </div>

                {activities.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 fade-up" style={{ animationDelay: "0.1s" }}>
                        <div className="flex bg-gray-100 rounded-full p-1">
                            <button
                                onClick={() => { setView("list"); setSelectedDate(null); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                    view === "list"
                                        ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <FontAwesomeIcon icon={faList} className="w-4 h-4" />
                                Lista
                            </button>
                            <button
                                onClick={() => setView("calendar")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                    view === "calendar"
                                        ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4" />
                                Calendario
                            </button>
                        </div>
                        <span className="text-sm text-gray-400">
                            {filteredActivities.length} actividad{filteredActivities.length !== 1 ? "es" : ""}
                            {selectedDate && (
                                <> &middot; <button onClick={() => setSelectedDate(null)} className="text-yambo-green-600 hover:underline font-medium">Limpiar filtro</button></>
                            )}
                        </span>
                    </div>
                )}

                {activities.length === 0 ? (
                    <div className="text-center py-24 fade-up">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yambo-green-50 mb-6">
                            <FontAwesomeIcon icon={faCalendarDays} className="w-10 h-10 text-yambo-green-300" />
                        </div>
                        <h2 className="text-xl font-bold text-yambo-black mb-2">No hay actividades públicas</h2>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Cuando se publiquen nuevas actividades, las verás aquí. ¡Vuelve pronto!
                        </p>
                    </div>
                ) : view === "calendar" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
                        <ActivityCalendar
                            activities={activities}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                        <div className="space-y-5">
                            {selectedDate && (
                                <h2 className="text-lg font-bold text-yambo-black capitalize">
                                    {selectedDate.toLocaleDateString("es-ES", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </h2>
                            )}
                            {sortedActivities.length === 0 ? (
                                <div className="text-center py-12">
                                    <FontAwesomeIcon icon={faCalendarDays} className="w-8 h-8 text-gray-200 mb-3" />
                                    <p className="text-gray-400 text-sm">
                                        No hay actividades para esta fecha.
                                    </p>
                                </div>
                            ) : (
                                sortedActivities.map((a) => (
                                    <ActivityCard
                                        key={a.id}
                                        activity={a}
                                        expanded={expandedId === a.id}
                                        onToggle={() => toggleExpanded(a.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <ActivitySection
                            title="Próximas"
                            activities={upcoming}
                            expandedId={expandedId}
                            onToggle={toggleExpanded}
                        />
                        <ActivitySection
                            title="Pasadas"
                            activities={past}
                            expandedId={expandedId}
                            onToggle={toggleExpanded}
                            defaultCollapsed={upcoming.length > 0}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
