import { ApiService } from "./apiService";

/**
 * Roles de proyecto configurables (issue #126).
 *
 * El backend expone el CRUD en `/admin/project-roles`. Cada rol declara su
 * clave (business key, inmutable), su nombre de mostrar y si es de equipo
 * (`isTeam`).
 */
export interface ProjectRole {
    key: string;
    name: string;
    isTeam: boolean;
}

export interface CreateProjectRoleRequest {
    key: string;
    name: string;
    isTeam: boolean;
}

export interface UpdateProjectRoleRequest {
    name: string;
    isTeam?: boolean;
}

export class ProjectRoleService extends ApiService {
    /** Todos los roles, en el orden que devuelve el backend. */
    public async listRoles(): Promise<ProjectRole[]> {
        return await this.get<ProjectRole[]>("/admin/project-roles");
    }

    /** Solo los roles de equipo (`isTeam`), ordenados por nombre. */
    public async listTeamRoles(): Promise<ProjectRole[]> {
        return await this.get<ProjectRole[]>("/admin/project-roles/team");
    }

    public async createRole(data: CreateProjectRoleRequest): Promise<ProjectRole> {
        return await this.post<ProjectRole, CreateProjectRoleRequest>(
            "/admin/project-roles",
            data,
        );
    }

    public async updateRole(key: string, data: UpdateProjectRoleRequest): Promise<ProjectRole> {
        return await this.put<ProjectRole, UpdateProjectRoleRequest>(
            `/admin/project-roles/${key}`,
            data,
        );
    }

    public async deleteRole(key: string): Promise<void> {
        await this.delete<never>(`/admin/project-roles/${key}`);
    }
}

export const projectRoleService = new ProjectRoleService();
