import type { Activity } from "~/types/activity";
import { ActivityStatus } from "~/types/activity";

export const UPCOMING_STATUSES = new Set([
    ActivityStatus.PLANNED,
    ActivityStatus.OPEN_REGISTRATION,
    ActivityStatus.REGISTRATION_CLOSED,
]);

export function stripMarkdown(md: string): string {
    return md
        .replace(/[#*_~`>\[\]()!|-]/g, "")
        .replace(/\n+/g, " ")
        .trim();
}

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function formatDateRange(activity: Activity) {
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

export function activityMatchesSearch(activity: Activity, query: string) {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
        activity.name.toLowerCase().includes(q) ||
        (activity.description && stripMarkdown(activity.description).toLowerCase().includes(q)) ||
        (activity.location && activity.location.toLowerCase().includes(q)) ||
        (activity.project?.name && activity.project.name.toLowerCase().includes(q)) ||
        (activity.status?.label && activity.status.label.toLowerCase().includes(q))
    );
}

export function isDateInRange(date: Date, activity: Activity) {
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

export function isSameDay(d1: Date, d2: Date) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

export function getActivityDays(activity: Activity): Date[] {
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

export function getImageSrc(activity: Activity): string | null {
    if (!activity.image) return null;
    return activity.image.startsWith("/") ? `/api${activity.image}` : activity.image;
}

export const ITEMS_PER_PAGE = 6;
