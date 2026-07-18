import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Activity } from "~/types/activity";
import { UPCOMING_STATUSES } from "~/utils/activity-helpers";
import ActivityCard from "~/components/ActivityCard";
import SectionWrapper from "~/components/home/SectionWrapper";

interface ActivitiesPreviewProps {
    title?: string;
    activities: Activity[];
    sectionIndex: number;
}

export default function ActivitiesPreview({ title, activities, sectionIndex }: ActivitiesPreviewProps) {
    const { t } = useTranslation();

    const displayActivities = useMemo(() => {
        const now = new Date();

        const upcoming = activities.filter((a) => {
            const endOrStart = a.endDate ?? a.date;
            if (endOrStart) return new Date(endOrStart).getTime() >= now.getTime();
            return a.status && UPCOMING_STATUSES.has(a.status.value as any);
        });

        const past = activities.filter((a) => {
            const endOrStart = a.endDate ?? a.date;
            if (endOrStart) return new Date(endOrStart).getTime() < now.getTime();
            return !(a.status && UPCOMING_STATUSES.has(a.status.value as any));
        });

        const sortedUpcoming = [...upcoming].sort((a, b) => {
            const aDate = a.date ? new Date(a.date).getTime() : Infinity;
            const bDate = b.date ? new Date(b.date).getTime() : Infinity;
            return aDate - bDate;
        });

        const sortedPast = [...past].sort((a, b) => {
            const aDate = a.date ? new Date(a.date).getTime() : -Infinity;
            const bDate = b.date ? new Date(b.date).getTime() : -Infinity;
            return bDate - aDate;
        });

        const result = sortedUpcoming.slice(0, 3);
        if (result.length < 3) {
            result.push(...sortedPast.slice(0, 3 - result.length));
        }
        return result;
    }, [activities]);

    return (
        <SectionWrapper
            id="actividades"
            sectionIndex={sectionIndex}
            title={title}
            subtitle={t("public.activitiesSubtitle")}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayActivities.map((act) => (
                    <ActivityCard
                        key={act.id}
                        activity={act}
                        expanded={false}
                        onToggle={() => {}}
                        compact
                    />
                ))}
            </div>

            <div className="text-center mt-10">
                <a
                    href="/actividades"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 hover:shadow-lg hover:shadow-yambo-green-500/25 transition-all duration-300"
                >
                    {t("public.activitiesShowAll")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </div>
        </SectionWrapper>
    );
}
