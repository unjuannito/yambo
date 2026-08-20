import { ApiService } from "./apiService";
import type { GroupRole } from "~/types/role";

export interface ProjectRoleInvitation {
    id: string;
    token: string;
    projectId: string;
    role: GroupRole;
    email: string | null;
    createdBy: string;
    createdAt: string;
    expiresAt: string | null;
    usedByUserId: string | null;
    usedAt: string | null;
    used: boolean;
    expired: boolean;
    invitationLink: string;
}

export interface CreateProjectRoleInvitationRequest {
    projectId: string;
    role: GroupRole;
    email?: string;
    expiresAt?: string;
}

export class ProjectRoleInvitationService extends ApiService {
    public async createInvitation(
        data: CreateProjectRoleInvitationRequest,
    ): Promise<ProjectRoleInvitation> {
        return await this.post<ProjectRoleInvitation, CreateProjectRoleInvitationRequest>(
            "/project-role-invitations",
            data,
        );
    }

    public async getInvitations(
        projectId?: string,
    ): Promise<ProjectRoleInvitation[]> {
        const params = new URLSearchParams();
        if (projectId) params.append("projectId", projectId);
        const query = params.toString();
        return await this.get<ProjectRoleInvitation[]>(
            `/project-role-invitations${query ? `?${query}` : ""}`,
        );
    }

    public async acceptInvitation(token: string): Promise<string> {
        return await this.post<string, Record<string, never>>(
            `/project-role-invitations/${token}/accept`,
            {},
        );
    }

    public async getInvitationInfo(token: string): Promise<{
        projectId: string;
        projectName: string;
        role: GroupRole;
        used: boolean;
        expired: boolean;
        email: string | null;
    }> {
        return await this.get(`/project-role-invitations/${token}`);
    }

    public async deleteInvitation(id: string): Promise<string> {
        return await this.delete<string>(`/project-role-invitations/${id}`);
    }

    public async revokeAllParentRolesByProject(projectId: string): Promise<string> {
        return await this.delete<string>(
            `/project-role-invitations/by-project/${projectId}/roles`,
        );
    }

    public async listParents(): Promise<{
        projectId: string;
        projectName: string;
        parents: { userId: string; name: string; email: string }[];
    }[]> {
        return await this.get(`/project-role-invitations/parents`);
    }

    public async removeParentRole(projectId: string, userId: string): Promise<string> {
        return await this.delete<string>(
            `/project-role-invitations/parents/${projectId}/${userId}`,
        );
    }
}

export const projectRoleInvitationService = new ProjectRoleInvitationService();
