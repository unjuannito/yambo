import { useState, useEffect, useCallback } from "react";
import { useAuth } from "~/hooks/useAuth";
import {
    dashboardService,
    type PersonalDashboardData,
    type AdminDashboardData,
    type DashboardOrder,
} from "~/services/dashboardService";

export type { PersonalDashboardData, AdminDashboardData, DashboardOrder };

export interface DashboardData {
    personal: PersonalDashboardData;
    admin: AdminDashboardData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const data = await dashboardService.getDashboardData();

            setPersonal(data.personal);
            setAdmin(data.admin);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error al cargar los datos del dashboard"
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { personal, admin, loading, error, refetch: fetchData };
}
