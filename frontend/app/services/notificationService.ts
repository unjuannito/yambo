import { ApiService } from "./apiService";
import type { Notification, NotificationPage } from "~/types/notification";

/**
 * Servicio de la bandeja de avisos (issue #124). La consulta inicial y las
 * acciones van por REST; el push en tiempo real llega por el canal WebSocket
 * (ver useNotifications).
 */
export class NotificationService extends ApiService {
    async list(page = 0, size = 15): Promise<NotificationPage> {
        return await this.get(`/notifications?page=${page}&size=${size}`);
    }

    async getUnreadCount(): Promise<number> {
        return await this.get(`/notifications/unread-count`);
    }

    async markRead(id: string): Promise<void> {
        await this.post(`/notifications/${id}/read`, {});
    }

    async markAllRead(): Promise<void> {
        await this.post(`/notifications/read-all`, {});
    }

    async clearAll(): Promise<void> {
        await this.delete(`/notifications`);
    }
}

export const notificationService = new NotificationService();
