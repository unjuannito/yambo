import { ApiService } from './apiService';
import type { Activity } from '~/types/activity';

export interface HomeSettings {
    [key: string]: string;
}

export interface FeaturedProject {
    id: string;
    name: string;
    description: string;
    image: string;
}

export interface StaffGroup {
    id: string;
    name: string | null;
    projectName: string;
    role: 'MONITOR' | 'COORDINATOR';
}

export interface StaffMember {
    id: string;
    name: string;
    photo: string;
    bio: string;
    funFact: string;
    role: 'MONITOR' | 'COORDINATOR' | 'BOTH';
    groups: StaffGroup[];
}

export interface ActiveProject {
    id: string;
    name: string;
    season: string | null;
    description: string | null;
    image: string | null;
    featured: boolean;
}

export interface ProjectGroupDetail {
    id: string;
    name: string | null;
}

export interface SeoMetadata {
    metaDescription: string | null;
    keywords: string[];
    ogDescription: string | null;
    slug: string | null;
}

export interface ProjectDetail {
    id: string;
    name: string;
    season: string | null;
    description: string | null;
    image: string | null;
    groups: ProjectGroupDetail[];
    staff: StaffMember[];
    seo: SeoMetadata | null;
}

export interface ContactSettings {
    [key: string]: string;
}

export class PublicService extends ApiService {
    public async getHomeSettings(): Promise<HomeSettings> {
        return await this.get('/public/settings/home');
    }

    public async getContactSettings(): Promise<ContactSettings> {
        return await this.get('/public/settings/contact');
    }

    public async getFeaturedProjects(): Promise<FeaturedProject[]> {
        return await this.get('/public/projects/featured');
    }

    public async getStaff(): Promise<StaffMember[]> {
        return await this.get('/public/monitors');
    }

    public async getActiveProjects(): Promise<ActiveProject[]> {
        return await this.get('/public/projects/active');
    }

    public async getProjectDetail(id: string): Promise<ProjectDetail> {
        return await this.get(`/public/projects/${id}`);
    }

    public async getPublicActivities(): Promise<Activity[]> {
        return await this.get('/public/activities');
    }
}

export const publicService = new PublicService();
