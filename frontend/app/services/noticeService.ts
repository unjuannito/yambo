import { ApiService } from "./apiService";

export interface Notice {
    id: string;
    title: string;
    content: string;
    image: string | null;
    slug: string | null;
    pinned: boolean;
    public: boolean;
    publishedAt: string;
    expiresAt: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NoticeRequest {
    title: string;
    content: string;
    image?: string | null;
    pinned: boolean;
    isPublic: boolean;
    expiresAt?: string | null;
}

export class NoticeService extends ApiService {
    // ── Admin: full CRUD ─────────────────────────────────────────────────

    public async listNotices(): Promise<Notice[]> {
        return await this.get<Notice[]>("/notices");
    }

    public async getNotice(id: string): Promise<Notice> {
        return await this.get<Notice>(`/notices/${id}`);
    }

    public async createNotice(data: NoticeRequest): Promise<Notice> {
        return await this.post<Notice, NoticeRequest>("/notices", data);
    }

    public async updateNotice(id: string, data: NoticeRequest): Promise<Notice> {
        return await this.put<Notice, NoticeRequest>(`/notices/${id}`, data);
    }

    public async deleteNotice(id: string): Promise<void> {
        return await this.delete<void>(`/notices/${id}`);
    }

    // ── Any logged-in member: dashboard home widget ─────────────────────

    public async getActiveNotices(): Promise<Notice[]> {
        return await this.get<Notice[]>("/notices/active");
    }

    // ── Public (no login) ────────────────────────────────────────────────

    public async getPublicNotices(): Promise<Notice[]> {
        return await this.get<Notice[]>("/public/notices");
    }

    public async getPublicNotice(idOrSlug: string): Promise<Notice> {
        return await this.get<Notice>(`/public/notices/${idOrSlug}`);
    }
}

export const noticeService = new NoticeService();
