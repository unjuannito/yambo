import { ApiService } from './apiService';

export interface Invitation {
  id: number;
  token: string;
  createdAt: string;
  startTms: string;
  expiresAt: string | null;
  invitedBy: string | null;
  profileIds: string[];
}

export interface CreateInvitationRequest {
  profileIds: string[];
  startTms?: string;
  endTms?: string;
}

export interface AcceptInvitationRequest {
  email?: string;
  password?: string;
  name?: string;
}

export interface AcceptInvitationResponse {
  userId: string;
  email: string;
  name: string;
}

export class InvitationService extends ApiService {
  public async createInvitation(
    request: CreateInvitationRequest
  ): Promise<Invitation> {
    return await this.post('/invitations', request);
  }

  public async listInvitations(startDate?: string): Promise<Invitation[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    const query = params.toString();
    return await this.get(`/invitations${query ? `?${query}` : ''}`);
  }

  public async disableInvitation(id: number): Promise<Invitation> {
    return await this.put(`/invitations/${id}/disable`, undefined as never);
  }

  public async acceptInvitation(
    token: string,
    request?: AcceptInvitationRequest
  ): Promise<AcceptInvitationResponse> {
    return await this.post(`/invitations/${token}/accept`, request);
  }
}

export const invitationService = new InvitationService();
