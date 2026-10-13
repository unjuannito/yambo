import { useTranslation } from "react-i18next";
import type { FeaturedProject } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";
import SectionWrapper from "~/components/home/SectionWrapper";

interface FeaturedProjectsProps {
    projects: FeaturedProject[];
    title?: string;
    sectionIndex: number;
}

export default function FeaturedProjects({ projects, title, sectionIndex }: FeaturedProjectsProps) {
    const { t } = useTranslation();

    return (
        <SectionWrapper
            sectionIndex={sectionIndex}
            title={title}
            subtitle={t("public.projectsDescription")}
            blobs={[
                { color: "green", position: "top-10 -left-20", opacity: "opacity-40" },
                { color: "purple", position: "-bottom-10 right-10", opacity: "opacity-30" },
            ]}
        >
            <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 pb-4 scrollbar-hide">
                {projects.map((project, idx) => {
                    const pc = projectColor(project.id, project.signatureColor);
                    return (
                        <div
                            key={project.id}
                            className="min-w-[300px] md:min-w-[380px] snap-start group fade-up"
                            style={{
                                animationDelay: `${idx * 100}ms`,
                                "--pc-text": pc.text,
                                "--pc-text-hover": pc.textHover,
                            } as React.CSSProperties}
                        >
                            <div
                                className="rounded-2xl p-[2px]"
                                style={{
                                    background: project.signatureColor
                                        ? `linear-gradient(135deg, ${project.signatureColor}, ${project.signatureColor}66)`
                                        : "linear-gradient(135deg, var(--color-yambo-green-400), var(--color-yambo-purple-400))",
                                }}
                            >
                                <div className="bg-white rounded-[calc(1rem-2px)] overflow-hidden">
                                    <div className="relative overflow-hidden">
                                        <img
                                            loading="lazy"
                                            decoding="async"
                                            src={project.image}
                                            alt={project.name}
                                            className="w-full h-56 object-contain group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-xl font-bold text-yambo-black mb-2 transition-colors group-hover:[color:var(--pc-text-hover)]">
                                            {project.name}
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                                            {project.description}
                                        </p>
                                        <a
                                            href={`/proyectos/${project.id}`}
                                            className="inline-flex items-center gap-1 text-sm font-semibold transition-colors [color:var(--pc-text)] hover:[color:var(--pc-text-hover)]"
                                        >
                                            {t("public.projectsView")}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SectionWrapper>
    );
}
