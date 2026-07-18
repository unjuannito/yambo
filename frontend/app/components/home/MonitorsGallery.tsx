import { useTranslation } from "react-i18next";
import type { StaffMember } from "~/services/publicService";
import MonitorCard from "~/components/MonitorCard";
import SectionWrapper from "~/components/home/SectionWrapper";

interface MonitorsGalleryProps {
    monitors: StaffMember[];
    title?: string;
    sectionIndex: number;
}

export default function MonitorsGallery({ monitors, title, sectionIndex }: MonitorsGalleryProps) {
    const { t } = useTranslation();

    return (
        <SectionWrapper
            id="monitores"
            sectionIndex={sectionIndex}
            title={title}
            subtitle={t("public.monitorsSubtitle")}
            blobs={[{ color: "purple", position: "-top-10 left-20", opacity: "opacity-40" }]}
        >
            <div className="flex space-x-6 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 px-1">
                {monitors.map((monitor, idx) => (
                    <div
                        key={monitor.id}
                        className="w-[220px] min-w-[220px] flex-shrink-0 fade-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <MonitorCard monitor={monitor} />
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}
