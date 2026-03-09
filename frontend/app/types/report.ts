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
    products: ProductAnalytics;
}

export interface ProductRanking {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
}

export interface FamilyProductSales {
    familyId: string;
    familyName: string;
    quantity: number;
    revenue: number;
}

export interface ProductFunnel {
    productId: string;
    productName: string;
    views: number;
    purchases: number;
    conversionRate: number;
}

export interface ProductAnalytics {
    totalProductsSold: number;
    uniqueProductsSold: number;
    totalProductRevenue: number;
    topProductsByQuantity: ProductRanking[];
    topProductsByRevenue: ProductRanking[];
    salesByFamily: FamilyProductSales[];
    productSalesOverTime: TimeSeriesPoint[];
    productRevenueOverTime: TimeSeriesDecimalPoint[];
    productsByStatus: Record<string, number>;
    totalViews: number | null;
    uniqueViewedProducts: number | null;
    conversionFunnel: ProductFunnel[] | null;
}
