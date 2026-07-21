import { ApiService } from "./apiService";

export interface ParentInvitation {
    id: string;
    token: string;
    familyProductId: string;
    email: string | null;
    createdBy: string;
    createdAt: string;
    expiresAt: string | null;
    usedByUserId: string | null;
    usedAt: string | null;
    used: boolean;
    expired: boolean;
    invitationLink: string;
}

export interface CreateParentInvitationRequest {
    familyProductId: string;
    email?: string;
    expiresAt?: string;
}

export class ParentInvitationService extends ApiService {
    public async createInvitation(
        data: CreateParentInvitationRequest,
    ): Promise<ParentInvitation> {
        return await this.post<ParentInvitation, CreateParentInvitationRequest>(
            "/parent-invitations",
            data,
        );
    }

    public async getInvitations(
        familyProductId?: string,
    ): Promise<ParentInvitation[]> {
        const params = new URLSearchParams();
        if (familyProductId) params.append("familyProductId", familyProductId);
        const query = params.toString();
        return await this.get<ParentInvitation[]>(
            `/parent-invitations${query ? `?${query}` : ""}`,
        );
    }

    public async acceptInvitation(token: string): Promise<string> {
        return await this.post<string, Record<string, never>>(
            `/parent-invitations/${token}/accept`,
            {},
        );
    }

    public async getInvitationInfo(token: string): Promise<{
        familyProductId: string;
        familyProductName: string;
        used: boolean;
        expired: boolean;
        email: string | null;
    }> {
        return await this.get(`/parent-invitations/${token}`);
    }

    public async deleteInvitation(id: string): Promise<string> {
        return await this.delete<string>(`/parent-invitations/${id}`);
    }

    public async revokeAllParentRoles(familyProductId: string): Promise<string> {
        return await this.delete<string>(
            `/parent-invitations/by-product/${familyProductId}/roles`,
        );
    }
}

export const parentInvitationService = new ParentInvitationService();
