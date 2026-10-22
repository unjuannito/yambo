import { ApiService } from "./apiService";

export interface LegalPageAdmin {
    id: string;
    type: string;
    title: string;
    content: string;
    version: number;
    published: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LegalPageUpdateRequest {
    title: string;
    content: string;
    published: boolean;
}

class AdminLegalPageService extends ApiService {
    async listAll(): Promise<LegalPageAdmin[]> {
        return this.get<LegalPageAdmin[]>("/admin/legal");
    }

    async getById(id: string): Promise<LegalPageAdmin> {
        return this.get<LegalPageAdmin>(`/admin/legal/${id}`);
    }

    async update(id: string, data: LegalPageUpdateRequest): Promise<LegalPageAdmin> {
        return this.put<LegalPageAdmin, LegalPageUpdateRequest>(`/admin/legal/${id}`, data);
    }
}

export const adminLegalPageService = new AdminLegalPageService();
