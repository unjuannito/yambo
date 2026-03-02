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

    const activities = data.recentActivities ?? [];

    const counts: Record<string, number> = {
        totalUsers: data.totalUsers ?? 0,
        totalOrders: data.totalOrders ?? 0,
        totalProjects: data.totalProjects ?? 0,
        totalProducts: data.totalProducts ?? 0,
        activities: activities.length,
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

                    {activities.length > 0 && (
                        <RecentActivitiesList activities={activities} />
                    )}
                </div>
            </div>
        </div>
    );
}
