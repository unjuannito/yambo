import type { User } from '~/types/userType';
import { ApiService } from './apiService';
import type { PagedInfo } from '~/types/apiType';

export interface PagedUsers {
    content: User[];
    page: PagedInfo;
}

export interface UserFilters {
    name?: string;
    email?: string;
    enabled?: boolean;
    profiles?: string[];
}

export interface UpdateProfilesRequest {
    profiles: string[];
}

export interface UpdateProfileRequest {
    id: string;
    name: string;
    email: string;
}

export class AdminUserService extends ApiService {
    public async listUsers(params: UserFilters & {
        page?: number;
        size?: number;
        sortBy?: string;
        direction?: 'ASC' | 'DESC';
    }): Promise<PagedUsers> {
        const queryParams = new URLSearchParams();
        
        if (params.name) queryParams.append('name', params.name);
        if (params.email) queryParams.append('email', params.email);
        if (params.enabled !== undefined) queryParams.append('enabled', String(params.enabled));
        if (params.profiles) queryParams.append('profiles', params.profiles.join(','));
        if (params.page !== undefined) queryParams.append('page', String(params.page));
        if (params.size !== undefined) queryParams.append('size', String(params.size));
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.direction) queryParams.append('direction', params.direction);

        return await this.get<PagedUsers>(`/admin/users?${queryParams.toString()}`);
    }

    public async updateUserProfiles(userId: string, profileIds: string[]): Promise<User> {
        return await this.put<User, UpdateProfilesRequest>(
            `/admin/users/profiles?userId=${userId}`,
            { profiles: profileIds }
        );
    }

    public async updateUserProfile(data: UpdateProfileRequest): Promise<User> {
        return await this.put<User, UpdateProfileRequest>('/admin/users/profile', data);
    }

    public async deleteUser(userId: string): Promise<string> {
        return await this.delete<string>(`/admin/users/${userId}`);
    }
}
