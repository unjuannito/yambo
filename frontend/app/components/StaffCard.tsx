import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { StaffMember } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";
import { staffRoleLabels } from "~/utils/staffRoleLabels";
import { Modal } from "~/components/common/Modal";
import ElephantAvatar from "~/components/ElephantAvatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { ResponsiveImage } from "~/components/common/ResponsiveImage";

interface StaffCardProps {
    member: StaffMember;
    projectName?: string;
}

export default function StaffCard({ member, projectName }: StaffCardProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const displayName = member.nickname || member.name;

    const roleLabels = staffRoleLabels(member.groups, t, projectName);

    const groupBadges = roleLabels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
            {roleLabels.map((r) => {
                if (r.role === "COORDINATOR") {
                    return (
                        <span
                            key={r.key}
                            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-yambo-purple-100 text-yambo-purple-700"
                        >
                            {r.label}
                        </span>
                    );
                }
                const { bg, text } = projectColor(r.colorSeed);
                return (
                    <span
                        key={r.key}
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: bg, color: text }}
                    >
                        {r.label}
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
                aria-label={t('public.staffViewProfile', { name: displayName })}
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
                    {member.photo ? (
                        <ResponsiveImage
                            src={member.photo}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: "center top" }}
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                            maxWidth={480}
                        />
                    ) : (
                        <ElephantAvatar seed={member.id} config={member.avatar} title={displayName} className="w-full h-full" />
                    )}
                </div>
                <div className="p-3">
                    <h3 className="text-base font-bold text-yambo-black line-clamp-2">
                        {displayName}
                    </h3>
                    {groupBadges}
                    {member.bio && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                            {member.bio}
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
                            {member.photo ? (
                                <ResponsiveImage
                                    src={member.photo}
                                    alt={displayName}
                                    className="w-full max-h-[50vh] sm:max-h-none rounded-2xl object-cover"
                                    style={{ objectPosition: "center top" }}
                                    sizes="(min-width: 640px) 256px, 100vw"
                                    maxWidth={800}
                                />
                            ) : (
                                <ElephantAvatar seed={member.id} config={member.avatar} title={displayName} className="w-full aspect-[5/6] rounded-2xl" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            {member.nickname && (
                                <p className="text-sm text-gray-500">{member.name}</p>
                            )}
                            {groupBadges}
                            {member.bio && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-yambo-green-600">
                                        {t('public.staffAboutTitle')}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
                                        {member.bio}
                                    </p>
                                </div>
                            )}
                            {member.instagramUrl && (
                                <a
                                    href={member.instagramUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-yambo-purple-700 hover:underline"
                                >
                                    <FontAwesomeIcon icon={faInstagram} className="w-4 h-4" />
                                    {t('public.staffInstagram')}
                                </a>
                            )}
                            {member.funFact && (
                                <div className="mt-4 rounded-xl bg-yambo-purple-100/60 px-4 py-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-yambo-purple-700">
                                        {t('public.staffFunFact')}
                                    </h3>
                                    <p className="mt-0.5 text-sm text-gray-700 break-words">{member.funFact}</p>
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
