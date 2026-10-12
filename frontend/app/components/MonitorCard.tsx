import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { StaffMember } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";
import { Modal } from "~/components/common/Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

interface MonitorCardProps {
    monitor: StaffMember;
    roleLabel?: string;
    projectName?: string;
}

export default function MonitorCard({ monitor, roleLabel, projectName }: MonitorCardProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const displayName = monitor.nickname || monitor.name;

    const displayGroups = projectName
        ? monitor.groups
            .filter(g => g.projectName === projectName && g.name)
            .map(g => ({ ...g, label: g.name! }))
        : monitor.groups.map(g => ({
            ...g,
            label: g.name ? `${g.projectName} - ${g.name}` : g.projectName,
        }));

    const groupBadges = displayGroups.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
            {displayGroups.map((g) => {
                const { bg, text } = projectColor(g.projectName + (g.name || ""));
                return (
                    <span
                        key={g.id}
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: bg, color: text }}
                    >
                        {g.label}
                    </span>
                );
            })}
        </div>
    );

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                aria-label={t('public.monitorViewProfile', { name: displayName })}
                onClick={() => setIsOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsOpen(true);
                    }
                }}
                className="h-full rounded-2xl shadow-md overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover-lift cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-400"
            >
                <div className="w-full h-[220px] overflow-hidden">
                    {monitor.photo ? (
                        <img
                            src={monitor.photo}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: "center top" }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yambo-green-100 to-yambo-purple-100 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUser} className="w-10 h-10 text-yambo-green-300 opacity-60" />
                        </div>
                    )}
                </div>
                <div className="p-3">
                    <h3 className="text-base font-bold text-yambo-black line-clamp-2">
                        {displayName}
                    </h3>
                    {roleLabel && (
                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yambo-purple-100 text-yambo-purple-700">
                            {roleLabel}
                        </span>
                    )}
                    {groupBadges}
                    {monitor.bio && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                            {monitor.bio}
                        </p>
                    )}
                </div>
            </div>

            {/* Portal: los ancestros animados (fade-up, hover-lift) romperían el position: fixed del modal */}
            {isOpen && createPortal(
                <Modal
                    isOpen
                    onClose={() => setIsOpen(false)}
                    title={displayName}
                    size="md"
                    variant="bottom-sheet"
                >
                    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
                        <div className="w-full sm:w-64 shrink-0">
                            {monitor.photo ? (
                                <img
                                    src={monitor.photo}
                                    alt={displayName}
                                    className="w-full max-h-[50vh] sm:max-h-none rounded-2xl object-cover"
                                    style={{ objectPosition: "center top" }}
                                />
                            ) : (
                                <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-yambo-green-100 to-yambo-purple-100 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faUser} className="w-16 h-16 text-yambo-green-300 opacity-60" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            {monitor.nickname && (
                                <p className="text-sm text-gray-500">{monitor.name}</p>
                            )}
                            {groupBadges}
                            {monitor.bio && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-yambo-green-600">
                                        {t('public.monitorAboutTitle')}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
                                        {monitor.bio}
                                    </p>
                                </div>
                            )}
                            {monitor.funFact && (
                                <div className="mt-4 rounded-xl bg-yambo-purple-100/60 px-4 py-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-yambo-purple-700">
                                        {t('public.monitorFunFact')}
                                    </h3>
                                    <p className="mt-0.5 text-sm text-gray-700 break-words">{monitor.funFact}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>,
                document.body
            )}
        </>
    );
}
