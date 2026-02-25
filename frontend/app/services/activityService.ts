import { ApiService } from './apiService';
import type { Activity, ActivityManager } from '~/types/activity';

export class ActivityService extends ApiService {
    public async getPublicActivities(): Promise<Activity[]> {
        return await this.get('/public/activities');
    }

    public async getActivities(page = 0, size = 20): Promise<{ content: Activity[]; totalElements: number; totalPages: number }> {
        return await this.get(`/activities?page=${page}&size=${size}`);
    }

    public async getActivity(id: string): Promise<Activity> {
        return await this.get(`/activities/${id}`);
    }

    public async createActivity(data: {
        name: string;
        description?: string;
        date?: string;
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
        status?: string;
        isPublic?: boolean;
        projectId?: string;
        managerId?: string;
    }): Promise<Activity> {
        return await this.put(`/activities/${id}`, data);
    }

    public async getProjectMonitors(projectId: string): Promise<ActivityManager[]> {
        return await this.get(`/activities/projects/${projectId}/monitors`);
    }

    public async deleteActivity(id: string): Promise<void> {
        return await this.delete(`/activities/${id}`);
    }
}

export const activityService = new ActivityService();
