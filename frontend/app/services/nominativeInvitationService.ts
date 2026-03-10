import { ApiService } from "./apiService";

export interface NominativeInvitation {
    id: string;
    email: string;
    token: string;
    createdAt: string;
    expiresAt: string;
    used: boolean;
    invitedBy: string;
    invitedByUser: {
        id: string;
        username: string;
        name: string;
        email: string;
    } | null;
    profileIds: string[];
}

export interface CreateNominativeInvitationRequest {
    email: string;
    name: string;
    profileIds: string[];
}

export interface BatchInvitationRequest {
    emails: string[];
    profileIds: string[];
}

export interface BatchInvitationResponse {
    batchId: string;
    invitations: NominativeInvitation[];
}

export class NominativeInvitationService extends ApiService {
    public async getAllInvitations(startDate?: string): Promise<NominativeInvitation[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        const query = params.toString();
        return await this.get<NominativeInvitation[]>(
            `/nominative-invitations${query ? `?${query}` : ''}`,
        );
    }

    public async createInvitation(
        data: CreateNominativeInvitationRequest,
    ): Promise<NominativeInvitation> {
        return await this.post<
            NominativeInvitation,
            CreateNominativeInvitationRequest
        >("/nominative-invitations", data);
    }

    public async deleteInvitation(id: string): Promise<string> {
        return await this.delete<string>(`/nominative-invitations/${id}`);
    }

    public async createBatchInvitations(
        data: BatchInvitationRequest,
    ): Promise<BatchInvitationResponse> {
        return await this.post<BatchInvitationResponse, BatchInvitationRequest>(
            "/nominative-invitations/batch",
            data,
        );
    }

    public async register(
        invitationToken: string,
        data: { password: string; name: string },
    ): Promise<{ token: string }> {
        const response = await this.post<
            { token: string },
            { password: string; name: string }
        >(`/auth/register?invitation=${invitationToken}`, data);
        ApiService.setToken(response.token);
        return response;
    }
}

export const nominativeInvitationService = new NominativeInvitationService();
