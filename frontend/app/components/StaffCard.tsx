import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StaffMember } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

interface StaffCardProps {
    member: StaffMember;
    roleLabel?: string;
    projectName?: string;
}

export default function StaffCard({ member, roleLabel, projectName }: StaffCardProps) {
    const { t } = useTranslation();
    const [isFlipped, setIsFlipped] = useState(false);
    const hasFunFact = !!member.funFact;

    const displayGroups = projectName
        ? member.groups
            .filter(g => g.projectName === projectName && g.name)
            .map(g => ({ ...g, label: g.name! }))
        : member.groups.map(g => ({
            ...g,
            label: g.name ? `${g.projectName} - ${g.name}` : g.projectName,
        }));

    return (
        <div
            className="ee-card-perspective"
            onDoubleClick={() => hasFunFact && setIsFlipped((f) => !f)}
        >
            <div className={`ee-card-inner ${isFlipped ? "ee-flipped" : ""}`}>
                {/* Front face */}
                <div className="ee-card-front rounded-2xl shadow-md overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover-lift">
                    <div className="w-full h-[220px] overflow-hidden">
                        {member.photo ? (
                            <img
                                src={member.photo}
                                alt={member.name}
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
                            {member.name}
                        </h3>
                        {roleLabel && (
                            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yambo-purple-100 text-yambo-purple-700">
                                {roleLabel}
                            </span>
                        )}
                        {displayGroups.length > 0 && (
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
                        )}
                        {member.bio && (
                            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                                {member.bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* Back face */}
                <div className="ee-card-back rounded-2xl shadow-md overflow-hidden bg-gradient-to-br from-yambo-green-500 to-yambo-purple-500 text-white flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-4xl mb-4">...</div>
                    <h3 className="text-lg font-bold mb-2">{member.name}</h3>
                    <p className="text-base leading-relaxed opacity-90">
                        {member.funFact}
                    </p>
                    <p className="text-xs mt-6 opacity-50">
                        {t('common.close')}
                    </p>
                </div>
            </div>
        </div>
    );
}
