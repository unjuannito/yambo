import { ApiService } from './apiService';
import type { CurrentUser, NotificationPreferences } from '~/types/userType';

export interface UpdateProfileRequest {
  name: string;
  email: string;
  photo?: string;
  bio?: string;
  funFact?: string;
  nickname?: string;
  publicVisible?: boolean;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export class UserService extends ApiService {
  public async getCurrentUser(): Promise<CurrentUser> {
    return await this.get<CurrentUser>('/user/me');
  }

  public async updateProfile(data: UpdateProfileRequest): Promise<CurrentUser> {
    return await this.put<CurrentUser, UpdateProfileRequest>('/user/profile', data);
  }

  public async changePassword(data: ChangePasswordRequest): Promise<void> {
    return await this.put<void, ChangePasswordRequest>('/user/change-password', data);
  }

  public async deleteAccount(): Promise<string> {
    return await this.post<string, {}>('/user/delete', {});
  }

  public async getNotificationPreferences(): Promise<NotificationPreferences> {
    return await this.get<NotificationPreferences>('/user/notification-preferences');
  }

  public async updateNotificationPreferences(data: NotificationPreferences): Promise<NotificationPreferences> {
    return await this.put<NotificationPreferences, NotificationPreferences>('/user/notification-preferences', data);
  }
}

export const userService = new UserService();
