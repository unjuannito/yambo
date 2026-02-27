import SummaryCards from "~/components/dashboard/home/SummaryCards";
import RecentActivitiesList from "~/components/dashboard/home/RecentActivitiesList";
import { ADMIN_CARDS } from "~/data/summaries";
import { useAuth } from "~/hooks/useAuth";
import type { AdminDashboardData } from "~/hooks/useDashboardData";

interface AdminStatsSectionProps {
    data: AdminDashboardData;
}

export default function AdminStatsSection({ data }: AdminStatsSectionProps) {
    const { hasPermission } = useAuth();

    const hasAnyAdminPerm =
        hasPermission({ obj: "user", action: "read" }) ||
        hasPermission({ obj: "order", action: "read" }) ||
        hasPermission({ obj: "project", action: "read" });

    if (!hasAnyAdminPerm) return null;

    const counts: Record<string, number> = {
        totalUsers: data.totalUsers,
        totalOrders: data.totalOrders,
        totalProjects: data.totalProjects,
        totalProducts: data.totalProducts,
        activities: data.recentActivities.length,
    };

    return (
        <div className="space-y-6">
            <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Administración
                </h2>

                <div className="space-y-6">
                    <SummaryCards
                        cards={ADMIN_CARDS}
                        counts={counts}
                        title="Resumen de la plataforma"
                    />

                    {data.recentActivities.length > 0 && (
                        <RecentActivitiesList activities={data.recentActivities} />
                    )}
                </div>
            </div>
        </div>
    );
}
