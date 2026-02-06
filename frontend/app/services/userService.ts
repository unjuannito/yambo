import { ApiService } from './apiService';
import type { CurrentUser } from '~/types/userType';

export interface UpdateProfileRequest {
  name: string;
  email: string;
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
}

export const userService = new UserService();
