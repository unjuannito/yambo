import { ApiService } from './apiService';

export interface Permission {
    id: string;
    description: string;
}

export interface Profile {
    id: string;
    name: string;
    permissions: Permission[];
    isDefault: boolean;
}

export interface UpdateProfilePermissionsRequest {
    permissionIds: string[];
}

export interface CreateProfileRequest {
    ProfileId: string;
    permissionIds?: string[];
}

export class ProfileService extends ApiService {
    public async getAllProfiles(): Promise<Profile[]> {
        return await this.get<Profile[]>('/admin/profiles');
    }

    public async getProfile(ProfileId: string): Promise<Profile> {
        return await this.get<Profile>(`/admin/profiles/${ProfileId}`);
    }

    public async getAllPermissions(): Promise<Permission[]> {
        return await this.get<Permission[]>('/admin/profiles/permissions');
    }

    public async updateProfilePermissions(ProfileId: string, permissionIds: string[]): Promise<Profile> {
        return await this.put<Profile, UpdateProfilePermissionsRequest>(
            `/admin/profiles/${ProfileId}/permissions`,
            { permissionIds }
        );
    }

    public async createProfile(data: CreateProfileRequest): Promise<Profile> {
        return await this.post<Profile, CreateProfileRequest>('/admin/profiles', data);
    }

    public async deleteProfile(ProfileId: string): Promise<string> {
        return await this.delete<string>(`/admin/profiles/${ProfileId}`);
    }

    public async updateProfileDefaultStatus(ProfileId: string, isDefault: boolean): Promise<Profile> {
        return await this.put<Profile, { isDefault: boolean }>(
            `/admin/profiles/${ProfileId}/default`,
            { isDefault }
        );
    }
}

export const profileService = new ProfileService();