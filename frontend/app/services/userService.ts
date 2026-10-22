import { ApiService } from './apiService';
import type { ElephantAvatarConfig } from '~/components/ElephantAvatar';
import type { CurrentUser, NotificationPreferences } from '~/types/userType';
import type { PhotoEdit } from '~/utils/photoCrop';

export interface UpdateProfileRequest {
  name: string;
  email: string;
}

/** Los campos omitidos no se tocan; los vacíos se borran. */
export interface UpdateStaffRequest {
  photo?: string;
  photoOriginal?: string | null;
  photoEdit?: PhotoEdit | null;
  bio?: string;
  funFact?: string;
  nickname?: string;
  photoConsent?: boolean;
  instagramUrl?: string;
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

  public async updateStaff(data: UpdateStaffRequest): Promise<CurrentUser> {
    return await this.put<CurrentUser, UpdateStaffRequest>('/user/staff', data);
  }

  public async updateStaffAvatar(avatar: ElephantAvatarConfig): Promise<CurrentUser> {
    return await this.put<CurrentUser, ElephantAvatarConfig>('/user/staff/avatar', avatar);
  }

  /** Vuelve al elefante por defecto. */
  public async resetStaffAvatar(): Promise<CurrentUser> {
    return await this.delete<CurrentUser>('/user/staff/avatar');
  }

  public async deleteStaff(): Promise<CurrentUser> {
    return await this.delete<CurrentUser>('/user/staff');
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
