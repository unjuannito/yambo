import { ApiService } from "./apiService";

export interface LegalPage {
    id: string;
    type: string;
    title: string;
    content: string;
    version: number;
    publishedAt: string | null;
    updatedAt: string;
}

export class LegalPageService extends ApiService {
    public async getPublishedPages(): Promise<LegalPage[]> {
        return await this.get<LegalPage[]>("/public/legal");
    }

    public async getPublishedById(id: string): Promise<LegalPage> {
        return await this.get<LegalPage>(`/public/legal/${id}`);
    }
}

export const legalPageService = new LegalPageService();
