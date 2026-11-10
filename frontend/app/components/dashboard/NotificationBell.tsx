import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faBell,
    faTruckFast,
    faCircleXmark,
    faCircleExclamation,
    faComment,
    faInbox,
    faCheck,
    faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { useNotifications } from "~/hooks/useNotifications";
import type { Notification } from "~/types/notification";

/** Fecha relativa corta (hoy/hora, ayer, o dd MMM) para la bandeja. */
function formatWhen(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay) {
        return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
    if (d.toDateString() === yesterday.toDateString()) return "Ayer";
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const ICONS_BY_TYPE: Record<string, IconDefinition> = {
    ORDER_STATUS: faTruckFast,
    ORDER_CANCEL: faCircleXmark,
    ISSUE_CREATED: faCircleExclamation,
    ISSUE_COMMENT: faComment,
};
const TINT_BY_TYPE: Record<string, string> = {
    ORDER_STATUS: "text-blue-600 bg-blue-100",
    ORDER_CANCEL: "text-rose-600 bg-rose-100",
    ISSUE_CREATED: "text-amber-600 bg-amber-100",
    ISSUE_COMMENT: "text-teal-600 bg-teal-100",
};
const FALLBACK: { icon: IconDefinition; tint: string } = {
    icon: faInbox,
    tint: "text-slate-600 bg-slate-100",
};

function notificationIcon(n: Notification): { icon: IconDefinition; tint: string } {
    if (!n.type) return FALLBACK;
    const icon = ICONS_BY_TYPE[n.type];
    return { icon: icon ?? faInbox, tint: TINT_BY_TYPE[n.type] ?? FALLBACK.tint };
}

/**
 * Campana de avisos (issue #124). Muestra el contador de no leídos y un dropdown
 * con la bandeja. Se alimenta del hook useNotifications, que ya mantiene el push
 * en tiempo real por WebSocket.
 */
export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const hasUnread = unreadCount > 0;

    const handleClick = (n: Notification) => {
        if (!n.isRead) markRead(n.id);
        if (n.link) {
            setOpen(false);
            window.location.assign(n.link);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                aria-label={`Avisos (${unreadCount} sin leer)`}
                onClick={() => setOpen((o) => !o)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
                {hasUnread && (
                    <span className="absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold leading-5 text-white shadow">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-700">Avisos</h3>
                        <div className="flex items-center gap-1">
                            {hasUnread && (
                                <button
                                    type="button"
                                    onClick={markAllRead}
                                    title="Marcar todo como leído"
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                >
                                    <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                                    Leído
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    title="Vaciar bandeja"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                                >
                                    <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="max-h-[24rem] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                                <FontAwesomeIcon icon={faInbox} className="h-8 w-8 text-slate-300" />
                                <p className="text-sm text-slate-500">No tienes avisos pendientes</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notifications.map((n) => {
                                    const { icon, tint } = notificationIcon(n);
                                    return (
                                        <li key={n.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleClick(n)}
                                                className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                                                    !n.isRead ? "bg-blue-50/50" : ""
                                                }`}
                                            >
                                                <span
                                                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}
                                                >
                                                    <FontAwesomeIcon icon={icon} className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-start justify-between gap-2">
                                                        <span
                                                            className={`text-sm ${
                                                                !n.isRead
                                                                    ? "font-semibold text-slate-800"
                                                                    : "font-medium text-slate-600"
                                                            }`}
                                                        >
                                                            {n.title}
                                                        </span>
                                                        <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400">
                                                            {formatWhen(n.createdAt)}
                                                        </span>
                                                    </span>
                                                    {n.body && (
                                                        <span className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                                            {n.body}
                                                        </span>
                                                    )}
                                                    {!n.isRead && (
                                                        <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
