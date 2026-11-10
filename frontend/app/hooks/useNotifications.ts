import { useEffect, useSyncExternalStore, useCallback } from "react";
import type { StompSubscription } from "@stomp/stompjs";
import { webSocketService } from "~/services/webSocketService";
import { notificationService } from "~/services/notificationService";
import { useAuth } from "~/hooks/useAuth";
import type { Notification, NotificationWsMessage } from "~/types/notification";

/**
 * Bandeja de avisos en tiempo real (issue #124).
 *
 * Un store de módulo (fuera de React) guarda la lista y el contador de no leídos;
 * los componentes se sincronizan con useSyncExternalStore. El hook:
 *  - suscribe al canal WebSocket /user/queue/notifications (la reconexión
 *    automática la gestiona el cliente STOMP) y añade cada aviso en vivo;
 *  - hace una consulta inicial por REST para cargar la bandeja y el contador;
 *  - refresca el contador por polling (safety net si la conexión WS está caída);
 *  - expone markRead / markAllRead / clearAll para la campana.
 */
type Listener = () => void;

let notifications: Notification[] = [];
let unreadCount = 0;
let hasLoaded = false;

const listeners = new Set<Listener>();
function emit() {
    for (const l of listeners) l();
}

function subscribeStore(cb: Listener) {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
const getSnapshot = () => notifications;

function addNotification(n: Notification) {
    if (notifications.some((x) => x.id === n.id)) return;
    notifications = [n, ...notifications].slice(0, 50);
    unreadCount += 1;
    emit();
}

function applyList(list: Notification[]) {
    notifications = list;
    unreadCount = list.filter((n) => !n.isRead).length;
    hasLoaded = true;
    emit();
}

export function useNotifications() {
    const { user } = useAuth();
    const list = useSyncExternalStore(subscribeStore, getSnapshot, getSnapshot);

    useEffect(() => {
        if (!user) return;

        let mounted = true;
        let sub: StompSubscription | null = null;

        const refreshCount = () => {
            if (!mounted) return;
            notificationService
                .getUnreadCount()
                .then((c) => {
                    if (mounted) {
                        unreadCount = c;
                        emit();
                    }
                })
                .catch(() => {
                    /* sin conexión: se mantiene el último valor */
                });
        };

        webSocketService
            .subscribe("/user/queue/notifications", (stompMsg) => {
                try {
                    const msg = JSON.parse(stompMsg.body) as NotificationWsMessage;
                    addNotification({
                        id: msg.id,
                        type: msg.type,
                        title: msg.title,
                        body: msg.body,
                        link: msg.link,
                        isRead: false,
                        readAt: null,
                        createdAt: msg.createdAt,
                    });
                } catch {
                    /* mensaje malformado: se ignora */
                }
            })
            .then((s) => {
                if (mounted) sub = s;
                else s.unsubscribe();
            });

        if (!hasLoaded) {
            notificationService
                .list(0, 20)
                .then((page) => {
                    if (mounted) applyList(page.content);
                })
                .catch(() => {
                    /* fallo de carga: se rellenará por WS */
                });
        }
        refreshCount();

        const poll = window.setInterval(refreshCount, 60000);

        return () => {
            mounted = false;
            window.clearInterval(poll);
            if (sub) sub.unsubscribe();
        };
    }, [user]);

    const markRead = useCallback((id: string) => {
        notifications = notifications.map((n) =>
            n.id === id && !n.isRead ? { ...n, isRead: true } : n,
        );
        unreadCount = Math.max(0, unreadCount - 1);
        emit();
        notificationService.markRead(id).catch(() => {});
    }, []);

    const markAllRead = useCallback(() => {
        notifications = notifications.map((n) => (n.isRead ? n : { ...n, isRead: true }));
        unreadCount = 0;
        emit();
        notificationService.markAllRead().catch(() => {});
    }, []);

    const clearAll = useCallback(() => {
        notifications = [];
        unreadCount = 0;
        emit();
        notificationService.clearAll().catch(() => {});
    }, []);

    return { notifications: list, unreadCount, markRead, markAllRead, clearAll };
}
