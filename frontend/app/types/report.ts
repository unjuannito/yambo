export interface TimeSeriesPoint {
    date: string;
    value: number;
}

export interface TimeSeriesDecimalPoint {
    date: string;
    value: number;
}

export interface OrderAnalytics {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    averageFulfillmentHours: number | null;
    ordersByStatus: Record<string, number>;
    ordersOverTime: TimeSeriesPoint[];
    revenueOverTime: TimeSeriesDecimalPoint[];
}

export interface UserEngagement {
    totalUsers: number;
    newRegistrations: number;
    activeUsers: number;
    totalLogins: number;
    engagementRate: number;
    registrationsOverTime: TimeSeriesPoint[];
    activeUsersOverTime: TimeSeriesPoint[];
}

export interface IssueMetrics {
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    averageResolutionHours: number | null;
    issuesByStatus: Record<string, number>;
    issuesOverTime: TimeSeriesPoint[];
}

export interface ReportSummary {
    orders: OrderAnalytics;
    users: UserEngagement;
    issues: IssueMetrics;
}
