import { ApiService } from "./apiService";

export interface SeoMetadataAdmin {
    id: string;
    entityType: string;
    entityId: string;
    entityName: string;
    metaDescription: string | null;
    keywords: string | null;
    ogDescription: string | null;
    slug: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SeoMetadataUpdateRequest {
    metaDescription?: string | null;
    keywords?: string | null;
    ogDescription?: string | null;
    slug?: string | null;
}

export interface SeoPagedResponse {
    content: SeoMetadataAdmin[];
    page: {
        totalElements: number;
        totalPages: number;
        number: number;
        size: number;
    };
}

export class SeoService extends ApiService {
    public async list(
        page = 0,
        size = 10,
        entityType?: string,
        sortBy = "updatedAt",
        direction: "ASC" | "DESC" = "DESC",
    ): Promise<SeoPagedResponse> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
            sortBy,
            direction,
        });
        if (entityType) params.append("entityType", entityType);

        return await this.get<SeoPagedResponse>(
            `/admin/seo?${params.toString()}`,
        );
    }

    public async getById(id: string): Promise<SeoMetadataAdmin> {
        return await this.get<SeoMetadataAdmin>(`/admin/seo/${id}`);
    }

    public async update(
        id: string,
        data: SeoMetadataUpdateRequest,
    ): Promise<SeoMetadataAdmin> {
        return await this.put<SeoMetadataAdmin, SeoMetadataUpdateRequest>(
            `/admin/seo/${id}`,
            data,
        );
    }

    public async remove(id: string): Promise<string> {
        return await this.delete<string>(`/admin/seo/${id}`);
    }

    public async regenerate(
        entityType: string,
        entityId: string,
    ): Promise<string> {
        return await this.post<string, Record<string, never>>(
            `/admin/seo/${entityType}/${entityId}/regenerate`,
            {},
        );
    }

    public async bulkGenerate(): Promise<string> {
        return await this.post<string, Record<string, never>>(
            `/admin/seo/bulk-generate`,
            {},
        );
    }
}

export const seoService = new SeoService();
