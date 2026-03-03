import { useState, useEffect, useCallback } from "react";
import { useAuth } from "~/hooks/useAuth";
import {
    dashboardService,
    type PersonalDashboardData,
    type AdminDashboardData,
    type DashboardOrder,
} from "~/services/dashboardService";
import { reportService } from "~/services/reportService";
import type { ReportSummary } from "~/types/report";

export type { PersonalDashboardData, AdminDashboardData, DashboardOrder };

export interface DashboardData {
    personal: PersonalDashboardData;
    admin: AdminDashboardData | null;
    reportSnapshot: ReportSummary | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

function getLast30Days(): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
    };
}

export function useDashboardData(): DashboardData {
    const { user } = useAuth();

    const [personal, setPersonal] = useState<PersonalDashboardData>({
        totalOrders: 0,
        ordersByStatus: {},
        recentOrders: [],
        totalIssues: 0,
    });

    const [admin, setAdmin] = useState<AdminDashboardData | null>(null);
    const [reportSnapshot, setReportSnapshot] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canReadReports = user?.permissions?.some(
        (p) => p.obj === "report" && p.actions.includes("read")
    ) ?? false;

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const data = await dashboardService.getDashboardData();

            setPersonal(data.personal);
            setAdmin(data.admin);

            // Fetch report snapshot if user has report read permission
            if (canReadReports) {
                try {
                    const { start, end } = getLast30Days();
                    const snapshot = await reportService.getSummary(start, end);
                    setReportSnapshot(snapshot);
                } catch {
                    // Silently fail — report data is optional for dashboard
                    setReportSnapshot(null);
                }
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error al cargar los datos del dashboard"
            );
        } finally {
            setLoading(false);
        }
    }, [user, canReadReports]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { personal, admin, reportSnapshot, loading, error, refetch: fetchData };
}
