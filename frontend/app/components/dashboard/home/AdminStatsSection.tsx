import React, { Suspense } from "react";
import SummaryCards from "~/components/dashboard/home/SummaryCards";
import RecentActivitiesList from "~/components/dashboard/home/RecentActivitiesList";
import { ADMIN_CARDS } from "~/data/summaries";
import { useAuth } from "~/hooks/useAuth";
import type { AdminDashboardData } from "~/hooks/useDashboardData";
import type { ReportSummary } from "~/types/report";

const ReportSnapshot = React.lazy(
    () => import("~/components/dashboard/home/ReportSnapshot")
);

interface AdminStatsSectionProps {
    data: AdminDashboardData;
    reportSnapshot?: ReportSummary | null;
}

export default function AdminStatsSection({ data, reportSnapshot }: AdminStatsSectionProps) {
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
        <div className="space-y-8">
            <div className="border-t-2 border-yambo-green-200 pt-8">
                <h2 className="text-2xl font-extrabold font-display text-yambo-black mb-6 flex items-center gap-3">
                    <span className="inline-block w-2 h-8 rounded-full bg-gradient-to-b from-yambo-green-400 to-yambo-green-600" />
                    Administración
                </h2>

                <div className="space-y-8">
                    <SummaryCards
                        cards={ADMIN_CARDS}
                        counts={counts}
                        title="Resumen de la plataforma"
                    />

                    {reportSnapshot && (
                        <Suspense
                            fallback={
                                <div className="animate-pulse rounded-2xl bg-yambo-green-50/50 h-64" />
                            }
                        >
                            <ReportSnapshot data={reportSnapshot} />
                        </Suspense>
                    )}

                    {activities.length > 0 && (
                        <RecentActivitiesList activities={activities} />
                    )}
                </div>
            </div>
        </div>
    );
}
