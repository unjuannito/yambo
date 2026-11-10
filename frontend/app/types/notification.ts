export interface Notification {
    id: string;
    type: string | null;
    title: string;
    body: string | null;
    link: string | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

/** Mensaje empujado en tiempo real al llegar un aviso (issue #124). */
export interface NotificationWsMessage {
    id: string;
    type: string | null;
    title: string;
    body: string | null;
    link: string | null;
    createdAt: string;
}

/** Página de avisos devuelta por el backend (Spring Page). */
export interface NotificationPage {
    content: Notification[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

