import { ApiService } from './apiService';
import type { Product } from './productService';

export interface Project {
  id: string;
  name: string;
  active: boolean;
  season?: string | null;
  description?: string | null;
  image?: string | null;
  featured: boolean;
  signatureColor?: string | null;
}

export interface CreateProjectRequest {
  name: string;
  active?: boolean;
  season?: string | null;
  description?: string | null;
  image?: string | null;
  featured?: boolean;
  signatureColor?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  active?: boolean;
  season?: string | null;
  description?: string | null;
  image?: string | null;
  featured?: boolean;
  signatureColor?: string | null;
}

export interface ProjectGroup {
  id: string;
  name: string | null;
  projectId: string;
  projectName: string;
}

export class ProjectService extends ApiService {
  public async listProjects(
    page = 0,
    size = 50,
    name?: string,
    active?: boolean,
    season?: string
  ): Promise<{ content: Project[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (name) params.append('name', name);
    if (active !== undefined) params.append('active', active.toString());
    if (season) params.append('season', season);

    return await this.get(`/projects?${params.toString()}`);
  }

  public async getProject(id: string): Promise<Project> {
    return await this.get(`/projects/${id}`);
  }

  public async createProject(request: CreateProjectRequest): Promise<Project> {
    return await this.post('/projects', request);
  }

  public async updateProject(id: string, request: UpdateProjectRequest): Promise<Project> {
    return await this.put(`/projects/${id}`, request);
  }

  public async deleteProject(id: string): Promise<void> {
    return await this.delete(`/projects/${id}`);
  }

  public async getProjectProducts(
    id: string,
    page = 0,
    size = 50,
    name?: string,
    active?: boolean
  ): Promise<{ content: Product[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (name) params.append('name', name);
    if (active !== undefined) params.append('active', active.toString());

    return await this.get(`/projects/${id}/products?${params.toString()}`);
  }

  // Group CRUD
  public async listGroups(projectId: string): Promise<ProjectGroup[]> {
    return await this.get(`/projects/${projectId}/groups`);
  }

  public async createGroup(projectId: string, name?: string | null): Promise<ProjectGroup> {
    return await this.post(`/projects/${projectId}/groups`, { name: name || null });
  }

  public async updateGroup(projectId: string, groupId: string, name: string): Promise<ProjectGroup> {
    return await this.put(`/projects/${projectId}/groups/${groupId}`, { name });
  }

  public async deleteGroup(projectId: string, groupId: string): Promise<void> {
    return await this.delete(`/projects/${projectId}/groups/${groupId}`);
  }
}

export const projectService = new ProjectService();
