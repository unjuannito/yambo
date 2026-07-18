import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Activity } from "~/types/activity";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import ActivityCard from "./ActivityCard";

interface ActivitySectionProps {
    title: string;
    activities: Activity[];
    expandedId: string | null;
    onToggle: (id: string) => void;
    defaultCollapsed?: boolean;
}

export default function ActivitySection({
    title,
    activities,
    expandedId,
    onToggle,
    defaultCollapsed = false,
}: ActivitySectionProps) {
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    if (activities.length === 0) return null;

    return (
        <div className="fade-up">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-3 mb-4 group/section w-full text-left"
            >
                <h2 className="text-2xl font-bold text-yambo-black font-display">
                    {title}
                </h2>
                <span className="text-sm text-gray-400 font-medium bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {activities.length} {activities.length !== 1 ? t('activities.title') : t('activities.title')}
                </span>
                <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
                />
            </button>
            {!collapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger mb-10">
                    {activities.map((a) => (
                        <ActivityCard
                            key={a.id}
                            activity={a}
                            expanded={expandedId === a.id}
                            onToggle={() => onToggle(a.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
