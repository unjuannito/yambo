import type { User } from "~/types/userType";
import type { GroupRole } from "~/types/role";
import { ApiService, type PagedParams } from "./apiService";
import type { PagedInfo } from "~/types/apiType";

export interface PagedUsers {
    content: User[];
    page: PagedInfo;
}

export interface UserFilters {
    query?: string;
    id?: string;
    profiles?: string[];
    enabled?: boolean;
    role?: string;
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
    funFact?: string;
    nickname?: string;
    publicVisible?: boolean;
}

export interface UpdateUserGroupsRequest {
    groupIds: string[];
}

export interface AssignGroupRoleRequest {
    groupId: string;
    role: GroupRole;
}

export interface GroupRoleResponse {
    groupId: string;
    groupName: string | null;
    projectId: string;
    projectName: string;
    role: GroupRole;
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

    public async assignGroupRole(
        userId: string,
        groupId: string,
        role: GroupRole
    ): Promise<User> {
        return await this.post<User, AssignGroupRoleRequest>(
            `/admin/users/${userId}/group-roles`,
            { groupId, role }
        );
    }

    public async removeGroupRole(
        userId: string,
        groupId: string,
        role: GroupRole
    ): Promise<User> {
        return await this.delete<User>(
            `/admin/users/${userId}/group-roles/${groupId}/${role}`
        );
    }

    public async getUserGroupRoles(userId: string): Promise<GroupRoleResponse[]> {
        return await this.get<GroupRoleResponse[]>(
            `/admin/users/${userId}/group-roles`
        );
    }

    public async getUserGrants(userId: string): Promise<AccessGrant[]> {
        return await this.get<AccessGrant[]>(`/admin/users/${userId}/grants`);
    }
}

/** Cómo obtuvo un usuario cada perfil/rol (origen de la concesión). */
export interface AccessGrant {
    id: number;
    userId: string;
    grantType: 'PROFILE' | 'GROUP_ROLE';
    profileId: string | null;
    profileName: string | null;
    projectGroupId: string | null;
    groupName: string | null;
    projectName: string | null;
    role: 'MONITOR' | 'COORDINATOR' | 'PARENT' | null;
    source: 'MANUAL' | 'INVITATION';
    invitationType: 'LINK' | 'NOMINATIVE' | 'PROJECT_ROLE' | null;
    invitationId: number | null;
    grantedBy: string | null;
    grantedByName: string | null;
    grantedAt: string;
    revokedAt: string | null;
}

export const adminUserService = new AdminUserService();
