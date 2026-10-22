import { ApiService } from "./apiService";
import type { Activity } from "~/types/activity";

export interface DashboardOrderProduct {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    status: string;
}

export interface DashboardOrder {
    id: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    status: string;
    createdAt: string;
    closedAt: string | null;
    hasOpenIssues: boolean;
    receiptFileId: string | null;
    products: DashboardOrderProduct[];
}

export interface PersonalDashboardData {
    totalOrders: number;
    ordersByStatus: Record<string, number>;
    recentOrders: DashboardOrder[];
    totalIssues: number;
}

export interface AdminDashboardData {
    totalUsers: number | null;
    totalOrders: number | null;
    totalProjects: number | null;
    totalProducts: number | null;
    recentActivities: Activity[] | null;
}

export interface DashboardDataResponse {
    personal: PersonalDashboardData;
    admin: AdminDashboardData | null;
}

class DashboardService extends ApiService {
    public async getDashboardData(): Promise<DashboardDataResponse> {
        return await this.get<DashboardDataResponse>("/dashboard");
    }
}

export const dashboardService = new DashboardService();
