import { ApiService } from './apiService';

export interface PromotionInvitation {
  id: number;
  token: string;
  createdAt: string;
  startTms: string;
  expiresAt: string | null;
  invitedBy: string | null;
  profileIds: string[];
}

export interface CreatePromotionInvitationRequest {
  profileIds: string[];
  startTms?: string;
  endTms?: string;
}

export interface AcceptPromotionInvitationRequest {
  email?: string;
  password?: string;
  name?: string;
}

export interface AcceptPromotionInvitationResponse {
  userId: string;
  email: string;
  name: string;
}

export class PromotionInvitationService extends ApiService {
  public async createPromotionInvitation(
    request: CreatePromotionInvitationRequest
  ): Promise<PromotionInvitation> {
    return await this.post('/promotion-invitations', request);
  }

  public async listPromotionInvitations(): Promise<PromotionInvitation[]> {
    return await this.get('/promotion-invitations');
  }

  public async disablePromotionInvitation(id: number): Promise<PromotionInvitation> {
    return await this.put(`/promotion-invitations/${id}/disable`, undefined as never);
  }

  public async acceptPromotionInvitation(
    token: string,
    request?: AcceptPromotionInvitationRequest
  ): Promise<AcceptPromotionInvitationResponse> {
    return await this.post(`/promotion-invitations/${token}/accept`, request);
  }
}

export const promotionInvitationService = new PromotionInvitationService();
