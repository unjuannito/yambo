import type { FeaturedProject } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";

interface FeaturedProjectsProps {
  projects: FeaturedProject[];
  title?: string;
  loading?: boolean;
}

export default function FeaturedProjects({ projects, title, loading }: FeaturedProjectsProps) {
  return (
    <section className="w-full bg-gradient-to-br from-yambo-green-50 via-white to-yambo-purple-50 py-20 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob-green top-10 -left-20 opacity-40" />
      <div className="blob-purple -bottom-10 right-10 opacity-30" />

      <div className="max-w-[1400px] mx-auto px-4 relative z-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3 text-yambo-black font-display">
          {title || "Proyectos Destacados"}
        </h2>
        <p className="text-center text-gray-500 mb-10 max-w-lg mx-auto">
          Descubre las iniciativas que hacen de Yambo un lugar especial
        </p>
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 pb-4 scrollbar-hide">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-[300px] md:min-w-[380px] snap-start bg-white shadow-md rounded-3xl overflow-hidden"
              >
                <div className="w-full h-56 bg-gray-200 animate-pulse" />
                <div className="p-5">
                  <div className="h-6 w-2/3 mb-2 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-4 w-full mb-1 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-4 w-3/4 mb-4 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-4 w-1/4 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            ))
          ) : projects.length > 0 ? (
            projects.map((project, idx) => {
              const pc = projectColor(project.id, project.signatureColor);
              return (
              <div
                key={project.id}
                className="min-w-[300px] md:min-w-[380px] snap-start group fade-up"
                style={{
                  animationDelay: `${idx * 100}ms`,
                  '--pc-text': pc.text,
                  '--pc-text-hover': pc.textHover,
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
                        src={project.image}
                        alt={project.name}
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
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
                        Ver proyecto →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <p className="text-gray-400 text-center w-full py-8">
              No hay proyectos destacados disponibles.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
