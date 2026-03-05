import type { User } from "~/types/userType";
import { ApiService, type PagedParams } from "./apiService";
import type { PagedInfo } from "~/types/apiType";

export interface PagedUsers {
    content: User[];
    page: PagedInfo;
}

export interface UserFilters {
    id?: string;
    name?: string;
    email?: string;
    enabled?: boolean;
    profiles?: string[];
}

export interface UpdateProfilesRequest {
    profileIds: string[];
}

export interface UpdateUserDetailsRequest {
    id: string;
    name: string;
    email: string;
    photo?: string;
    bio?: string;
}

export interface UpdateUserGroupsRequest {
    groupIds: string[];
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
            { profileIds }
        );
    }

    public async updateUserDetails(
        request: UpdateUserDetailsRequest
    ): Promise<User> {
        return await this.put<User, UpdateUserDetailsRequest>(
            `/admin/users/profile`,
            request
        );
    }

    public async deleteUser(userId: string): Promise<string> {
        return await this.delete<string>(`/admin/users/${userId}`);
    }

    public async updateUserGroups(
        userId: string,
        groupIds: string[]
    ): Promise<User> {
        return await this.put<User, UpdateUserGroupsRequest>(
            `/admin/users/${userId}/groups`,
            { groupIds }
        );
    }
}

export const adminUserService = new AdminUserService();
