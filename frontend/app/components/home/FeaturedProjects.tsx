import type { FeaturedProject } from "~/services/publicService";

interface FeaturedProjectsProps {
  projects: FeaturedProject[];
  title?: string;
  loading?: boolean;
}

export default function FeaturedProjects({ projects, title, loading }: FeaturedProjectsProps) {
  return (
    <section className="w-full bg-gray-50 py-16">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
          {title || "Proyectos Destacados"}
        </h2>
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 scrollbar-hide">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-[300px] md:min-w-[400px] snap-start bg-white shadow-lg rounded-xl overflow-hidden"
              >
                <div className="w-full h-56 bg-gray-200 animate-pulse" />
                <div className="p-4">
                  <div className="h-6 w-2/3 mb-2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full mb-1 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 mb-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className="min-w-[300px] md:min-w-[400px] snap-start bg-white shadow-lg rounded-xl overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-56 object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {project.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  <a
                    href={`/proyectos/${project.id}`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Ver proyecto →
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center w-full py-8">
              No hay proyectos destacados disponibles.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
