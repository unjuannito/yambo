import { useTranslation } from "react-i18next";
import type { StaffMember } from "~/services/publicService";
import StaffCard from "~/components/StaffCard";
import SectionWrapper from "~/components/home/SectionWrapper";

interface StaffGalleryProps {
    staff: StaffMember[];
    title?: string;
    sectionIndex: number;
}

export default function StaffGallery({ staff, title, sectionIndex }: StaffGalleryProps) {
    const { t } = useTranslation();

    return (
        <SectionWrapper
            id="equipo"
            sectionIndex={sectionIndex}
            title={title}
            subtitle={t("public.staffSubtitle")}
            blobs={[{ color: "purple", position: "-top-10 left-20", opacity: "opacity-40" }]}
        >
            <div className="flex space-x-6 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 px-1">
                {staff.map((member, idx) => (
                    <div
                        key={member.id}
                        className="w-[220px] min-w-[220px] flex-shrink-0 fade-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <StaffCard member={member} />
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}
