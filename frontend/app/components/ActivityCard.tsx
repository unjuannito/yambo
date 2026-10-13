import { useTranslation } from "react-i18next";
import type { Activity } from "~/types/activity";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faMapPin,
    faTag,
    faMoon,
    faChevronDown,
    faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { formatDateRange, stripMarkdown, getImageSrc } from "~/utils/activity-helpers";

interface ActivityCardProps {
    activity: Activity;
    expanded: boolean;
    onToggle: () => void;
    compact?: boolean;
}

export default function ActivityCard({ activity, expanded, onToggle, compact }: ActivityCardProps) {
    const { t } = useTranslation();

    const dateRange = formatDateRange(activity);

    const descriptionPreview = activity.description
        ? stripMarkdown(activity.description).slice(0, compact ? 80 : 120)
        : null;

    const hasMore =
        activity.description &&
        stripMarkdown(activity.description).length > (compact ? 80 : 120);

    const imageSrc = getImageSrc(activity);
    const detailUrl = `/actividades/${activity.id}`;

    if (compact) {
        return (
            <article className="group flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover-lift">
                {/* Image */}
                {imageSrc ? (
                    <a
                        href={detailUrl}
                        className="w-24 sm:w-28 shrink-0 self-stretch"
                    >
                        <div className="h-full overflow-hidden bg-yambo-black">
                            <img
                                loading="lazy"
                                decoding="async"
                                src={imageSrc}
                                alt={activity.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </a>
                ) : (
                    <div className="w-24 sm:w-28 shrink-0 self-stretch bg-yambo-purple-100 flex items-center justify-center">
                        <span className="font-display text-xl font-bold text-yambo-purple-300">
                            {activity.name.charAt(0)}
                        </span>
                    </div>
                )}

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col p-3">
                    <a href={detailUrl}>
                        <h3 className="text-sm font-bold leading-tight text-yambo-black transition-colors group-hover:text-yambo-green-700 sm:text-base">
                            {activity.name}
                        </h3>
                    </a>

                    {activity.status && (
                        <span
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold"
                            style={{ color: activity.status.color }}
                        >
                            <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{
                                    backgroundColor: activity.status.color,
                                }}
                            />
                            {activity.status.label}
                        </span>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {dateRange && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <FontAwesomeIcon
                                    icon={faCalendarDays}
                                    className="h-3 w-3 text-gray-400"
                                />
                                {dateRange.label}
                            </span>
                        )}

                        {activity.location && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <FontAwesomeIcon
                                    icon={faMapPin}
                                    className="h-3 w-3 text-gray-400"
                                />
                                <span className="truncate max-w-[100px]">
                                    {activity.location}
                                </span>
                            </span>
                        )}
                    </div>

                    {activity.price != null && (
                        <p className="mt-2 text-sm font-extrabold text-yambo-green-700">
                            {activity.price.toFixed(2).replace(".", ",")} €
                        </p>
                    )}

                    {descriptionPreview && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                            {descriptionPreview}
                            {hasMore ? "…" : ""}
                        </p>
                    )}

                    <div className="mt-auto pt-2">
                        <a
                            href={detailUrl}
                            className="inline-flex items-center gap-1 rounded-full bg-yambo-green-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-yambo-green-700"
                        >
                            {t("common.details") || "Detalle"}
                            <FontAwesomeIcon
                                icon={faArrowRight}
                                className="h-2.5 w-2.5"
                            />
                        </a>
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover-lift group flex flex-row">
            {/* Left: Image thumbnail */}
            {imageSrc ? (
                <a href={detailUrl} className="shrink-0">
                    <div className="w-36 sm:w-40 md:w-48 lg:w-48 aspect-[9/16] overflow-hidden bg-yambo-black">
                        <img
                            loading="lazy"
                            decoding="async"
                            src={imageSrc}
                            alt={activity.name}
                            className="w-full h-full object-contain"
                        />
                    </div>
                </a>
            ) : (
                <div className="w-28 sm:w-36 md:w-44 lg:w-52 shrink-0 bg-yambo-purple-100 flex items-center justify-center p-4">
                    <span className="text-2xl font-bold text-yambo-purple-300 font-display text-center leading-tight">
                        {activity.name.charAt(0)}
                    </span>
                </div>
            )}

            {/* Right: Content */}
            <div className="flex-1 p-3 sm:p-5 md:p-6 flex flex-col min-w-0">
                <a href={detailUrl} className="block mb-1">
                    <h3 className="text-sm sm:text-lg md:text-xl font-bold text-yambo-black group-hover:text-yambo-green-700 transition-colors leading-tight line-clamp-2">
                        {activity.name}
                    </h3>
                </a>

                {activity.status && (
                    <span
                        className="inline-flex items-center gap-1.5 text-sm font-semibold mb-2"
                        style={{ color: activity.status.color }}
                    >
                        <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{
                                backgroundColor: activity.status.color,
                            }}
                        />
                        {activity.status.label}
                    </span>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1">
                    {dateRange && (
                        <span className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                            <FontAwesomeIcon
                                icon={faCalendarDays}
                                className="w-3.5 h-3.5 text-gray-400"
                            />
                            {dateRange.label}

                            {dateRange.nights > 0 && (
                                <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 bg-yambo-purple-50 text-yambo-purple-600 rounded-full text-xs font-semibold">
                                    <FontAwesomeIcon
                                        icon={faMoon}
                                        className="w-2.5 h-2.5"
                                    />
                                    {dateRange.nights}{" "}
                                    {dateRange.nights !== 1
                                        ? t("public.activityNights")
                                        : t("public.activityNight")}
                                </span>
                            )}
                        </span>
                    )}

                    {activity.location && (
                        <span className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                            <FontAwesomeIcon
                                icon={faMapPin}
                                className="w-3.5 h-3.5 text-gray-400"
                            />
                            {activity.location}
                        </span>
                    )}
                </div>

                {activity.project && (
                    <div className="mb-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-yambo-purple-600 bg-yambo-purple-50 px-2.5 py-1 rounded-full">
                            <FontAwesomeIcon
                                icon={faTag}
                                className="w-3 h-3"
                            />
                            {activity.project.name}
                        </span>
                    </div>
                )}

                {activity.price != null && (
                    <p className="mb-1.5 text-sm sm:text-base font-extrabold text-yambo-green-700">
                        {activity.price.toFixed(2).replace(".", ",")} €
                    </p>
                )}

                {!expanded && descriptionPreview && (
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2">
                        {descriptionPreview}
                        {hasMore ? "…" : ""}
                    </p>
                )}
                {expanded && activity.description && (
                    <div className="mb-3 pt-2 border-t border-gray-100">
                        <div className="text-gray-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                            {activity.description}
                        </div>
                    </div>
                )}

                {/* Spacer + Footer */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    {activity.manager ? (
                        <div className="flex items-center gap-2 min-w-0">
                            {activity.manager.photo ? (
                                <img
                                    loading="lazy"
                                    decoding="async"
                                    src={activity.manager.photo}
                                    alt={activity.manager.name}
                                    className="h-7 w-7 rounded-full object-cover ring-2 ring-yambo-green-100 shadow-sm shrink-0"
                                />
                            ) : (
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-yambo-green-200 to-yambo-purple-200 flex items-center justify-center text-[10px] font-bold text-yambo-black ring-2 ring-white shadow-sm shrink-0">
                                    {activity.manager.name.charAt(0)}
                                </div>
                            )}

                            <span className="text-xs text-gray-500 truncate">
                                {activity.manager.name}
                            </span>
                        </div>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                        {activity.description && (
                            <span
                                onClick={onToggle}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" ||
                                        e.key === " "
                                    ) {
                                        e.preventDefault();
                                        onToggle();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-yambo-green-50 hover:text-yambo-green-600 px-2.5 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap"
                            >
                                {expanded
                                    ? t("common.close")
                                    : t("common.showMore")}
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`w-3 h-3 transition-transform duration-300 ${
                                        expanded ? "rotate-180" : ""
                                    }`}
                                />
                            </span>
                        )}

                        <a
                            href={detailUrl}
                            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-yambo-green-600 hover:bg-yambo-green-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                        >
                            {t("common.details")}
                            <FontAwesomeIcon
                                icon={faArrowRight}
                                className="w-3 h-3"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </article>
    );
}