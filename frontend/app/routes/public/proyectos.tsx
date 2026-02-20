import { useCallback, useEffect, useState } from "react";
import { publicService } from "~/services/publicService";
import type { ActiveProject } from "~/services/publicService";
import { hashColor } from "~/utils/hashColor";
import type { Route } from "./+types/proyectos";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Proyectos" },
    { name: "description", content: "Descubre todos los proyectos de Yambo." },
  ];
}

export default function Proyectos() {
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await publicService.getActiveProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <section className="w-full bg-white min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Proyectos</h1>
        <p className="text-gray-600 mb-10">
          Conoce todos los proyectos en los que trabajamos.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-xl shadow-md overflow-hidden"
              >
                <div className="w-full h-48 bg-gray-200 animate-pulse" />
                <div className="p-5">
                  <div className="h-6 w-2/3 mb-3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full mb-2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/proyectos/${project.id}`}
                className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {project.image ? (
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  (() => {
                    const { bg, border } = hashColor(project.id);
                    return (
                      <div
                        className="w-full h-48 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${bg}, ${border})` }}
                      >
                        <FontAwesomeIcon icon={faFolder} className="w-12 h-12 opacity-30" />
                      </div>
                    );
                  })()
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>
                    {project.season && (
                      (() => {
                        const { bg, text } = hashColor(project.id);
                        return (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: bg, color: text }}
                          >
                            {project.season}
                          </span>
                        );
                      })()
                    )}
                  </div>
                  {project.description && (
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {project.description}
                    </p>
                  )}
                  <span className="mt-3 inline-block text-blue-600 text-sm font-medium group-hover:underline">
                    Ver proyecto →
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">
            No hay proyectos disponibles en este momento.
          </p>
        )}
      </div>
    </section>
  );
}
