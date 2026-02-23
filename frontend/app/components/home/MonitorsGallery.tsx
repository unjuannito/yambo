import type { Monitor } from "~/services/publicService";
import MonitorCard from "~/components/home/MonitorCard";

interface MonitorsGalleryProps {
    monitors: Monitor[];
    title?: string;
    loading?: boolean;
}

export default function MonitorsGallery({ monitors, title, loading }: MonitorsGalleryProps) {
    return (
        <section id="monitores" className="w-full bg-white py-16">
            <div className="max-w-6xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{title || "Equipo de Monitores"}</h2>
                <div className="flex space-x-6 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2">
                    {loading ? (
                        [1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="min-w-[220px] rounded-xl shadow-md overflow-hidden bg-gray-50 flex-shrink-0"
                            >
                                <div className="w-full h-[220px] bg-gray-200 animate-pulse" />
                                <div className="p-3">
                                    <div className="h-5 w-2/3 mb-2 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                                </div>
                            </div>
                        ))
                    ) : monitors.length > 0 ? (
                        monitors.map((monitor) => (
                            <div key={monitor.id} className="min-w-[220px] flex-shrink-0">
                                <MonitorCard monitor={monitor} />
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center w-full py-8">
                            No hay monitores disponibles.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
