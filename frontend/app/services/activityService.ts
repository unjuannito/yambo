import { ApiService } from './apiService';
import type { Activity, ActivityManager } from '~/types/activity';

export class ActivityService extends ApiService {
    public async getPublicActivities(): Promise<Activity[]> {
        return await this.get('/public/activities');
    }

    public async getActivities(
        page = 0,
        size = 20,
        name?: string,
        status?: string,
        isPublic?: boolean,
        projectId?: string,
        managerId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<{ content: Activity[]; totalElements: number; totalPages: number }> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (name) params.append('name', name);
        if (status) params.append('status', status);
        if (isPublic !== undefined) params.append('isPublic', isPublic.toString());
        if (projectId) params.append('projectId', projectId);
        if (managerId) params.append('managerId', managerId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return await this.get(`/activities?${params}`);
    }

    public async getActivity(id: string): Promise<Activity> {
        return await this.get(`/activities/${id}`);
    }

    public async createActivity(data: {
        name: string;
        description?: string;
        date?: string;
        endDate?: string;
        status?: string;
        isPublic?: boolean;
        projectId: string;
        managerId?: string;
    }): Promise<Activity> {
        return await this.post('/activities', data);
    }

    public async updateActivity(id: string, data: {
        name?: string;
        description?: string;
        date?: string;
        endDate?: string;
        status?: string;
        isPublic?: boolean;
        projectId?: string;
        managerId?: string;
    }): Promise<Activity> {
        return await this.put(`/activities/${id}`, data);
    }

    public async getProjectStaff(projectId: string): Promise<ActivityManager[]> {
        return await this.get(`/activities/projects/${projectId}/monitors`);
    }

    public async deleteActivity(id: string): Promise<void> {
        return await this.delete(`/activities/${id}`);
    }
}

export const activityService = new ActivityService();
