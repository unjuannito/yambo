import { useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { getPublicActivities } from "~/services/publicService.server";
import type { Activity } from "~/types/activity";
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
            if (!a.date) continue;
            const d = new Date(a.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(a);
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
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
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
    const dateObj = activity.date ? new Date(activity.date) : null;

    return (
        <article
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer hover-lift"
            onClick={onToggle}
        >
            {/* Color accent bar */}
            <div
                className="h-1.5 rounded-t-full"
                style={{ backgroundColor: activity.status?.color || "#e5e7eb" }}
            />

            <div className="p-6">
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                    {activity.status && (
                        <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: activity.status.color }}
                        >
                            {activity.status.label}
                        </span>
                    )}
                    {dateObj && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                            {dateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}
                            {dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-bold text-yambo-black mb-1">
                    {activity.name}
                </h3>

                {activity.project && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                        <FontAwesomeIcon icon={faMapPin} className="w-3 h-3 text-yambo-green-400" />
                        {activity.project.name}
                    </p>
                )}

                {activity.manager && (
                    <div className="flex items-center gap-2 mb-3">
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
                )}

                {expanded && activity.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <MarkdownEditor value={activity.description} readOnly />
                    </div>
                )}

                {activity.description && (
                    <p className="text-xs text-yambo-green-600 mt-2 font-medium">
                        {expanded ? "Haz clic para cerrar" : "Haz clic para ver más"}
                    </p>
                )}
            </div>
        </article>
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

    const filteredActivities = useMemo(() => {
        if (!selectedDate) return activities;
        return activities.filter((a) => {
            if (!a.date) return false;
            return isSameDay(new Date(a.date), selectedDate);
        });
    }, [activities, selectedDate]);

    const sortedActivities = useMemo(() => {
        return [...filteredActivities].sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    }, [filteredActivities]);

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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 fade-up" style={{ animationDelay: "0.1s" }}>
                        <div className="flex bg-gray-100 rounded-full p-1">
                            <button
                                onClick={() => { setView("list"); setSelectedDate(null); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
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
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
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
                    <div className="text-center py-20">
                        <p className="text-6xl mb-4">📅</p>
                        <p className="text-gray-400 text-lg">
                            No hay actividades públicas disponibles.
                        </p>
                    </div>
                ) : view === "calendar" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
                        <ActivityCalendar
                            activities={activities}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                        <div className="space-y-4">
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
                                <p className="text-gray-400 text-sm py-8 text-center">
                                    No hay actividades para esta fecha.
                                </p>
                            ) : (
                                sortedActivities.map((a) => (
                                    <ActivityCard
                                        key={a.id}
                                        activity={a}
                                        expanded={expandedId === a.id}
                                        onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
                        {sortedActivities.map((a) => (
                            <ActivityCard
                                key={a.id}
                                activity={a}
                                expanded={expandedId === a.id}
                                onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
