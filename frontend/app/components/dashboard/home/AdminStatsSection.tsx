import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
        <div className="space-y-4">
            <div className="border-t border-yambo-green-200 pt-4">
                <h2 className="text-base font-bold font-display text-yambo-black mb-3 flex items-center gap-2">
                    <span className="inline-block w-1.5 h-4 rounded-full bg-gradient-to-b from-yambo-green-400 to-yambo-green-600" />
                    {t('dashboard.adminSection')}
                </h2>

                <div className="space-y-4">
                    <SummaryCards
                        cards={ADMIN_CARDS}
                        counts={counts}
                        title={t('dashboard.platformSummary')}
                        columns={3}
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
