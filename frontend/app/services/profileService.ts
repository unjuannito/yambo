import { ApiService } from './apiService';
import type { PagedResponse } from '~/types/apiType';

export interface Permission {
    id: string;
    description: string;
}

export interface Profile {
    id: string;
    name: string;
    permissions: Permission[];
}

export interface UpdateProfilePermissionsRequest {
    permissionIds: string[];
}

export interface CreateProfileRequest {
    name: string;
    permissionIds?: string[];
}

export interface UpdateProfileRequest {
    name: string;
    permissionIds: string[];
}

export class ProfileService extends ApiService {
    public async getAllProfiles(): Promise<Profile[]> {
        return await this.get<Profile[]>('/admin/profiles');
    }

    public async listProfiles(params: {
        id?: string;
        permissions?: string[];
        page: number;
        size: number;
    }): Promise<PagedResponse<Profile>> {
        const queryParams = new URLSearchParams();
        if (params.id) queryParams.append('id', params.id);
        if (params.permissions && params.permissions.length > 0) {
            params.permissions.forEach(p => queryParams.append('permissions', p));
        }
        queryParams.append('page', String(params.page));
        queryParams.append('size', String(params.size));

        return await this.get<PagedResponse<Profile>>(`/admin/profiles/list?${queryParams.toString()}`);
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

    public async updateProfile(ProfileId: string, name: string, permissionIds: string[]): Promise<Profile> {
        return await this.put<Profile, UpdateProfileRequest>(
            `/admin/profiles/${ProfileId}`,
            { name, permissionIds }
        );
    }

    public async createProfile(data: CreateProfileRequest): Promise<Profile> {
        return await this.post<Profile, CreateProfileRequest>('/admin/profiles', data);
    }

    public async deleteProfile(ProfileId: string): Promise<string> {
        return await this.delete<string>(`/admin/profiles/${ProfileId}`);
    }
}

export const profileService = new ProfileService();