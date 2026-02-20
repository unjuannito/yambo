import type { Monitor } from "~/services/publicService";
import { hashColor } from "~/utils/hashColor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

interface MonitorCardProps {
    monitor: Monitor;
}

export default function MonitorCard({ monitor }: MonitorCardProps) {
    return (
        <div className="rounded-xl shadow-md overflow-hidden bg-gray-50 hover:shadow-lg transition-shadow">
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
                <h3 className="text-base font-semibold text-gray-900">
                    {monitor.name}
                </h3>
                {monitor.groups && monitor.groups.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {monitor.groups.map((g) => {
                            const { bg, text } = hashColor(g.projectName + (g.name || ""));
                            return (
                                <span
                                    key={g.id}
                                    className="inline-block text-xs font-medium px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: bg, color: text }}
                                >
                                    {g.name
                                        ? `${g.projectName} - ${g.name}`
                                        : g.projectName}
                                </span>
                            );
                        })}
                    </div>
                )}
                {monitor.bio && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {monitor.bio}
                    </p>
                )}
            </div>
        </div>
    );
}
