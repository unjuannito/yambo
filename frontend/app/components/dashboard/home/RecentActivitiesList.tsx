import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import type { Activity } from "~/types/activity";
import ActivityCard from "~/components/ActivityCard";

interface RecentActivitiesListProps {
    activities: Activity[];
}

export default function RecentActivitiesList({
    activities,
}: RecentActivitiesListProps) {
    const { t } = useTranslation();

    const sorted = useMemo(
        () =>
            [...activities]
                .filter((a) => a.date)
                .sort(
                    (a, b) =>
                        new Date(b.date!).getTime() - new Date(a.date!).getTime()
                ),
        [activities]
    );

    const firstThree = sorted.slice(0, 3);

    if (activities.length === 0) {
        return (
            <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                    {t('dashboard.recentActivities')}
                </h2>
                <p className="text-gray-400 text-sm">{t('dashboard.noRecentActivities')}</p>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-display text-yambo-black">
                    {t('dashboard.recentActivities')}
                </h2>
                <Link
                    to="/mi-espacio/actividades"
                    className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                    {t('dashboard.viewAllActivities')}
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {firstThree.map((activity) => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        expanded={false}
                        onToggle={() => {}}
                        compact
                    />
                ))}
            </div>
        </section>
    );
}
