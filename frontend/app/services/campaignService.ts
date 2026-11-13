import type { EmailTemplateToken } from "./emailTemplateService";
import { ApiService } from "./apiService";

export type CampaignAudienceType = "ALL" | "PROFILE" | "PROJECT" | "GROUP" | "USERS";

/**
 * Vista de un comunicado para el admin. `body` es markdown y puede ser
 * `null` en la vista de lista (más ligera); el editor lo carga vía
 * {@code getById}.
 */
export interface CampaignView {
    id: string;
    subject: string;
    body: string | null;
    audienceType: CampaignAudienceType;
    audienceRef: string | null;
    audienceUsers: string[] | null;
    recipientCount: number;
    status: string;
    sentBy: string | null;
    createdAt: string;
    sentAt: string | null;
}

export interface CreateCampaignRequest {
    subject: string;
    body?: string | null;
    audienceType: CampaignAudienceType;
    audienceRef?: string | null;
    audienceUsers?: string[] | null;
}

export interface UpdateCampaignRequest {
    subject?: string | null;
    body?: string | null;
    audienceType?: CampaignAudienceType | null;
    audienceRef?: string | null;
    audienceUsers?: string[] | null;
}

export interface CampaignRecipientSummary {
    count: number;
    names: string[];
    emails: string[];
}

export interface CampaignPreviewResponse {
    html: string;
}

class CampaignService extends ApiService {
    async variables(): Promise<EmailTemplateToken[]> {
        return this.get<EmailTemplateToken[]>("/campaigns/variables");
    }

    async list(): Promise<CampaignView[]> {
        return this.get<CampaignView[]>("/campaigns");
    }

    async getById(id: string): Promise<CampaignView> {
        return this.get<CampaignView>(`/campaigns/${id}`);
    }

    async create(data: CreateCampaignRequest): Promise<CampaignView> {
        return this.post<CampaignView, CreateCampaignRequest>("/campaigns", data);
    }

    async update(id: string, data: UpdateCampaignRequest): Promise<CampaignView> {
        return this.put<CampaignView, UpdateCampaignRequest>(`/campaigns/${id}`, data);
    }

    async previewRecipients(id: string): Promise<CampaignRecipientSummary> {
        return this.get<CampaignRecipientSummary>(`/campaigns/${id}/recipients`);
    }

    async previewHtml(id: string): Promise<CampaignPreviewResponse> {
        return this.get<CampaignPreviewResponse>(`/campaigns/${id}/preview`);
    }

    async send(id: string): Promise<CampaignRecipientSummary> {
        return this.post<CampaignRecipientSummary, undefined>(`/campaigns/${id}/send`, undefined);
    }

    public async deleteCampaign(id: string): Promise<void> {
        await this.delete(`/campaigns/${id}`);
    }
}

export const campaignService = new CampaignService();
