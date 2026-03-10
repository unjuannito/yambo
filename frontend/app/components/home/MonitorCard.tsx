import { useState } from "react";
import type { StaffMember } from "~/services/publicService";
import { hashColor } from "~/utils/hashColor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

interface MonitorCardProps {
    monitor: StaffMember;
    roleLabel?: string;
    /** When set, only shows groups from this project and omits the project name prefix */
    projectName?: string;
}

export default function MonitorCard({ monitor, roleLabel, projectName }: MonitorCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const hasFunFact = !!monitor.funFact;

    // When inside a project page, filter to that project's groups and show only group name
    const displayGroups = projectName
        ? monitor.groups
            .filter(g => g.projectName === projectName && g.name)
            .map(g => ({ ...g, label: g.name! }))
        : monitor.groups.map(g => ({
            ...g,
            label: g.name ? `${g.projectName} - ${g.name}` : g.projectName,
        }));

    return (
        <div
            className="ee-card-perspective"
            onDoubleClick={() => hasFunFact && setIsFlipped((f) => !f)}
        >
            <div className={`ee-card-inner ${isFlipped ? "ee-flipped" : ""}`}>
                {/* ── Front face ────────────────────────────── */}
                <div className="ee-card-front rounded-xl shadow-md overflow-hidden bg-gray-50 hover:shadow-lg transition-shadow">
                    <div className="w-full h-[220px] overflow-hidden">
                        {monitor.photo ? (
                            <img
                                src={monitor.photo}
                                alt={monitor.name}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: "center top" }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
                                <FontAwesomeIcon icon={faUser} className="w-10 h-10 opacity-40" />
                            </div>
                        )}
                    </div>
                    <div className="p-3">
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {monitor.name}
                        </h3>
                        {roleLabel && (
                            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                {roleLabel}
                            </span>
                        )}
                        {displayGroups.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                                {displayGroups.map((g) => {
                                    const { bg, text } = hashColor(g.projectName + (g.name || ""));
                                    return (
                                        <span
                                            key={g.id}
                                            className="inline-block text-xs font-medium px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: bg, color: text }}
                                        >
                                            {g.label}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        {monitor.bio && (
                            <p className="text-xs text-gray-500 mt-1">
                                {monitor.bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Back face ─────────────────────────────── */}
                <div className="ee-card-back rounded-xl shadow-md overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 text-white flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-5xl mb-4">🤫</div>
                    <h3 className="text-lg font-bold mb-2">{monitor.name}</h3>
                    <p className="text-base leading-relaxed opacity-90">
                        {monitor.funFact}
                    </p>
                    <p className="text-xs mt-6 opacity-50">
                        Doble clic para volver
                    </p>
                </div>
            </div>
        </div>
    );
}
