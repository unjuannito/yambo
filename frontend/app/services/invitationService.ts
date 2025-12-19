import { ApiService } from './apiService';

export interface Invitation {
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

export interface CreateInvitationRequest {
    name: string;
    profileIds: string[];
}

export class InvitationService extends ApiService {
    public async getAllInvitations(): Promise<Invitation[]> {
        return await this.get<Invitation[]>('/invitations');
    }

    public async createInvitation(data: CreateInvitationRequest): Promise<Invitation> {
        return await this.post<Invitation, CreateInvitationRequest>('/invitations', data);
    }

    public async deleteInvitation(id: string): Promise<string> {
        return await this.delete<string>(`/invitations/${id}`);
    }

    public async register(invitationToken: string, data: { password: string; name: string }): Promise<{ token: string }> {
        return await this.post<{ token: string }, { password: string; name: string }>(`/auth/register?invitation=${invitationToken}`, data);
    }
}

export const invitationService = new InvitationService();