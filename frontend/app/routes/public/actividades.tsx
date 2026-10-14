import { useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getPublicActivities } from "~/services/publicService.server";
import type { Activity } from "~/types/activity";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faList,
    faChevronLeft,
    faChevronRight,
    faMapPin,
    faMoon,
    faChevronDown,
    faSearch,
    faTag,
    faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { getSiteUrl } from "~/utils/env.server";
import { collectionPageJsonLd, breadcrumbJsonLd, itemListJsonLd } from "~/utils/jsonld";
import { buildMeta, isIndexableActivity } from "~/utils/seo";
import type { Route } from "./+types/actividades";
import toast from "react-hot-toast";
import { fireEmojiRain } from "~/utils/confetti";
import {
    isSameDay,
    isDateInRange,
    activityMatchesSearch,
    getActivityDays,
    ITEMS_PER_PAGE,
} from "~/utils/activity-helpers";
import ActivityCard from "~/components/ActivityCard";
import Pagination from "~/components/Pagination";
import { activityPath } from "~/utils/publicPaths";

export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    const siteUrl = data?.siteUrl ?? "";
    const title = t('public.activitiesPageTitle');
    const description = t('public.activitiesMetaDescription');

    return [
        ...buildMeta({ siteUrl, path: "/actividades", title, description }),
        { "script:ld+json": collectionPageJsonLd({ name: title, description, url: `${siteUrl}/actividades` }) },
        { "script:ld+json": breadcrumbJsonLd([
            { name: t('nav.home'), url: siteUrl },
            { name: t('public.activitiesTitle'), url: `${siteUrl}/actividades` },
        ]) },
        { "script:ld+json": itemListJsonLd(
            (data?.activities ?? [])
                .filter((a) => isIndexableActivity(a))
                .map((a) => ({ name: a.name, url: `${siteUrl}${activityPath(a)}` })),
        ) },
    ];
}

// ── Calendar helpers ────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

// ── Skeleton ────────────────────────────────────────────────────────────

function ActivityCardSkeleton() {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-[9/16] bg-gray-200" />
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
    const { t } = useTranslation();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [todayGlow, setTodayGlow] = useState(false);

    const todayClicksRef = useRef(0);
    const todayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);

    const MONTH_NAMES = [
        t('public.activitiesMonth_0'), t('public.activitiesMonth_1'), t('public.activitiesMonth_2'),
        t('public.activitiesMonth_3'), t('public.activitiesMonth_4'), t('public.activitiesMonth_5'),
        t('public.activitiesMonth_6'), t('public.activitiesMonth_7'), t('public.activitiesMonth_8'),
        t('public.activitiesMonth_9'), t('public.activitiesMonth_10'), t('public.activitiesMonth_11'),
    ];

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
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:sticky lg:top-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={prev} className="p-2 rounded-xl hover:bg-yambo-green-50 transition text-gray-500 hover:text-yambo-green-600">
                    <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-bold text-yambo-black font-display">
                    {MONTH_NAMES[month]} {year}
                </h3>
                <button type="button" onClick={next} className="p-2 rounded-xl hover:bg-yambo-green-50 transition text-gray-500 hover:text-yambo-green-600">
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {[
                    t('public.activitiesDay_1'), t('public.activitiesDay_2'), t('public.activitiesDay_3'),
                    t('public.activitiesDay_4'), t('public.activitiesDay_5'), t('public.activitiesDay_6'),
                    t('public.activitiesDay_7'),
                ].map((d) => (
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
                        <button type="button"
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
                                        fireEmojiRain("*");
                                        toast(t('public.activitiesTodayToast'), {
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
                                <span className="absolute bottom-1 flex gap-0.5">
                                    {dayActivities.slice(0, 3).map((a, idx) => (
                                        <span
                                            key={a.id || `dot-${idx}`}
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
                <button type="button"
                    onClick={() => onSelectDate(null)}
                    className="mt-3 text-xs text-yambo-green-600 hover:underline w-full text-center font-medium"
                >
                    {t('public.activitiesShowAll')}
                </button>
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
    const { t } = useTranslation();
    const { activities } = useLoaderData<typeof loader>();
    const [view, setView] = useState<ViewMode>("list");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    const toggleExpanded = (id: string) => setExpandedId(expandedId === id ? null : id);

    const projects = useMemo(() => {
        const names = new Set<string>();
        for (const a of activities) {
            if (a.project?.name) names.add(a.project.name);
        }
        return Array.from(names).sort();
    }, [activities]);

    const filteredActivities = useMemo(() => {
        let filtered = activities;

        if (selectedDate) {
            filtered = filtered.filter((a) => isDateInRange(selectedDate, a));
        }

        if (selectedProject) {
            filtered = filtered.filter((a) => a.project?.name === selectedProject);
        }

        if (searchQuery.trim()) {
            filtered = filtered.filter((a) => activityMatchesSearch(a, searchQuery));
        }

        return filtered;
    }, [activities, selectedDate, selectedProject, searchQuery]);

    const sortedActivities = useMemo(() => {
        return [...filteredActivities].sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filteredActivities]);

    const totalPages = Math.max(1, Math.ceil(sortedActivities.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages - 1);
    const paginatedActivities = sortedActivities.slice(
        safePage * ITEMS_PER_PAGE,
        (safePage + 1) * ITEMS_PER_PAGE
    );

    return (
        <section className="w-full bg-gradient-to-b from-yambo-green-50/30 to-yambo-white min-h-screen pt-12 pb-16">
            <div className="max-w-8xl mx-auto px-4">
                {/* Header */}
                <div className="fade-up">
                    <h1 className="text-4xl font-extrabold text-yambo-black mb-2 font-display">{t('public.activitiesTitle')}</h1>
                    <p className="text-gray-500 mb-6">
                        {t('public.activitiesSubtitle')}
                    </p>
                </div>

                {/* Search bar */}
                {activities.length > 0 && (
                    <div className="relative mb-6 fade-up" style={{ animationDelay: "0.05s" }}>
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('public.activitiesSearch')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 transition-all"
                        />
                        {searchQuery && (
                            <button type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                            >
                                {t('common.clear')}
                            </button>
                        )}
                    </div>
                )}

                {/* Combined row: View toggle + Project filters */}
                {activities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-8 fade-up" style={{ animationDelay: "0.1s" }}>
                        {/* View toggle */}
                        <div className="flex bg-gray-100 rounded-full p-1 shrink-0">
                            <button type="button"
                                onClick={() => { setView("list"); setSelectedDate(null); setPage(0); }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    view === "list"
                                        ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <FontAwesomeIcon icon={faList} className="w-3.5 h-3.5" />
                                {t('public.activitiesListView')}
                            </button>
                            <button type="button"
                                onClick={() => { setView("calendar"); setPage(0); }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    view === "calendar"
                                        ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <FontAwesomeIcon icon={faCalendarDays} className="w-3.5 h-3.5" />
                                {t('public.activitiesCalendarView')}
                            </button>
                        </div>

                        {/* Project filter chips */}
                        {projects.length > 0 && !selectedDate && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button type="button"
                                    onClick={() => { setSelectedProject(null); setPage(0); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                        !selectedProject
                                            ? "bg-yambo-green-600 text-white shadow-sm"
                                            : "bg-white border border-gray-200 text-gray-500 hover:border-yambo-green-300 hover:text-yambo-green-600"
                                    }`}
                                >
                                    {t('common.all')}
                                </button>
                                {projects.map((name) => (
                                    <button type="button"
                                        key={name}
                                        onClick={() => { setSelectedProject(selectedProject === name ? null : name); setPage(0); }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                            selectedProject === name
                                                ? "bg-yambo-green-600 text-white shadow-sm"
                                                : "bg-white border border-gray-200 text-gray-500 hover:border-yambo-green-300 hover:text-yambo-green-600"
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* No activities at all */}
                {activities.length === 0 ? (
                    <div className="text-center py-24 fade-up">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yambo-green-50 mb-6">
                            <FontAwesomeIcon icon={faCalendarDays} className="w-10 h-10 text-yambo-green-300" />
                        </div>
                        <h2 className="text-xl font-bold text-yambo-black mb-2">{t('public.activitiesNoPublic')}</h2>
                        <p className="text-gray-400 max-w-md mx-auto">
                            {t('public.activitiesNoPublicDesc')}
                        </p>
                    </div>
                ) : view === "calendar" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:items-start">
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
                            {filteredActivities.length === 0 && (selectedDate || selectedProject || searchQuery) ? (
                                <div className="text-center py-12">
                                    <FontAwesomeIcon icon={faCalendarDays} className="w-8 h-8 text-gray-200 mb-3" />
                                    <p className="text-gray-400 text-sm">
                                        {t('public.activitiesNoDate')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
                                        {paginatedActivities.map((a) => (
                                            <ActivityCard
                                                key={a.id}
                                                activity={a}
                                                expanded={expandedId === a.id}
                                                onToggle={() => toggleExpanded(a.id)}
                                            />
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={safePage}
                                        totalPages={totalPages}
                                        onPageChange={setPage}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
                            {paginatedActivities.map((a) => (
                                <ActivityCard
                                    key={a.id}
                                    activity={a}
                                    expanded={expandedId === a.id}
                                    onToggle={() => toggleExpanded(a.id)}
                                />
                            ))}
                        </div>
                        <Pagination
                            currentPage={safePage}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
