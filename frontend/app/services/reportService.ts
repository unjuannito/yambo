import { ApiService } from "./apiService";
import type {
    ReportSummary,
    OrderAnalytics,
    UserEngagement,
    IssueMetrics,
} from "~/types/report";

class ReportServiceClass extends ApiService {
    public async getSummary(
        startDate: string,
        endDate: string
    ): Promise<ReportSummary> {
        const params = this.buildQueryParams({ startDate, endDate });
        return await this.get<ReportSummary>(
            `/reports/summary?${params.toString()}`
        );
    }

    public async getOrderAnalytics(
        startDate: string,
        endDate: string
    ): Promise<OrderAnalytics> {
        const params = this.buildQueryParams({ startDate, endDate });
        return await this.get<OrderAnalytics>(
            `/reports/orders?${params.toString()}`
        );
    }

    public async getUserEngagement(
        startDate: string,
        endDate: string
    ): Promise<UserEngagement> {
        const params = this.buildQueryParams({ startDate, endDate });
        return await this.get<UserEngagement>(
            `/reports/users?${params.toString()}`
        );
    }

    public async getIssueMetrics(
        startDate: string,
        endDate: string
    ): Promise<IssueMetrics> {
        const params = this.buildQueryParams({ startDate, endDate });
        return await this.get<IssueMetrics>(
            `/reports/issues?${params.toString()}`
        );
    }
}

export const reportService = new ReportServiceClass();
