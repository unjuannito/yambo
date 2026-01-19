import type { User } from "~/types/userType";
import { ApiService, type PagedParams } from "./apiService";
import type { PagedInfo } from "~/types/apiType";

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
    public async listUsers(
        params: UserFilters & PagedParams
    ): Promise<PagedUsers> {
        return await this.getPaged<PagedUsers>("/admin/users", params);
    }

    public async updateUserProfiles(
        userId: string,
        profileIds: string[]
    ): Promise<User> {
        return await this.put<User, UpdateProfilesRequest>(
            `/admin/users/profiles?userId=${userId}`,
            { profiles: profileIds }
        );
    }

    public async updateUserProfile(data: UpdateProfileRequest): Promise<User> {
        return await this.put<User, UpdateProfileRequest>(
            "/admin/users/profile",
            data
        );
    }

    public async deleteUser(userId: string): Promise<string> {
        return await this.delete<string>(`/admin/users/${userId}`);
    }
}

export const adminUserService = new AdminUserService();
