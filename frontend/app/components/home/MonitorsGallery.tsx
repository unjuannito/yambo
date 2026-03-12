import type { StaffMember } from "~/services/publicService";
import MonitorCard from "~/components/home/MonitorCard";

interface MonitorsGalleryProps {
    monitors: StaffMember[];
    title?: string;
    loading?: boolean;
}

export default function MonitorsGallery({ monitors, title, loading }: MonitorsGalleryProps) {
    return (
        <section id="monitores" className="w-full bg-gradient-to-br from-yambo-purple-50/50 via-white to-yambo-green-50/50 py-20 relative overflow-hidden">
            {/* Decorative blob */}
            <div className="blob-purple -top-10 left-20 opacity-40" />

            <div className="max-w-6xl mx-auto px-4 relative z-10">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-yambo-black font-display text-center">
                    {title || "Nuestro Equipo"}
                </h2>
                <p className="text-center text-gray-500 mb-10 max-w-md mx-auto">
                    Las personas que hacen posible la magia de Yambo
                </p>
                <div className="flex space-x-6 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 px-1">
                    {loading ? (
                        [1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="min-w-[220px] rounded-2xl shadow-md overflow-hidden bg-white flex-shrink-0"
                            >
                                <div className="w-full h-[220px] bg-gradient-to-br from-yambo-green-100 to-yambo-purple-100 animate-pulse" />
                                <div className="p-3">
                                    <div className="h-5 w-2/3 mb-2 bg-gray-200 rounded-lg animate-pulse" />
                                    <div className="h-4 w-1/3 bg-gray-200 rounded-lg animate-pulse" />
                                </div>
                            </div>
                        ))
                    ) : monitors.length > 0 ? (
                        monitors.map((monitor, idx) => (
                            <div
                                key={monitor.id}
                                className="w-[220px] min-w-[220px] flex-shrink-0 fade-up"
                                style={{ animationDelay: `${idx * 80}ms` }}
                            >
                                <MonitorCard monitor={monitor} />
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center w-full py-8">
                            No hay equipo disponible.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
