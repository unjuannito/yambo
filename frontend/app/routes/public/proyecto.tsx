import { useState } from "react";
import { useLoaderData } from "react-router";
import { getProjectDetail } from "~/services/publicService.server";
import type { ProjectDetail, Monitor, ProjectGroupDetail } from "~/services/publicService";
import MonitorCard from "~/components/home/MonitorCard";
import { hashColor } from "~/utils/hashColor";
import type { Route } from "./+types/proyecto";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export async function loader({ params }: Route.LoaderArgs) {
  const project = await getProjectDetail(params.projectId!);
  return { project };
}

export function meta({ data }: Route.MetaArgs) {
  const project = data?.project;
  const seo = project?.seo;

  const title = project ? `Yambo - ${project.name}` : "Yambo - Proyecto";
  const description = seo?.metaDescription ?? project?.description ?? "Detalle del proyecto";

  return [
    { title },
    { name: "description", content: description },
    ...(seo?.keywords?.length ? [{ name: "keywords", content: seo.keywords.join(", ") }] : []),
    { property: "og:title", content: title },
    { property: "og:description", content: seo?.ogDescription ?? description },
    { property: "og:type", content: "website" },
    ...(project?.image ? [{ property: "og:image", content: project.image }] : []),
  ];
}

export default function Proyecto() {
  const { project } = useLoaderData<typeof loader>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  // Named groups only (exclude default/unnamed groups)
  const namedGroups: ProjectGroupDetail[] = project?.groups.filter(g => g.name) ?? [];

  // Filter monitors
  const filteredMonitors: Monitor[] = (project?.monitors ?? []).filter((monitor) => {
    // Filter by group
    if (selectedGroupId) {
      const hasGroup = monitor.groups.some(g => g.id === selectedGroupId);
      if (!hasGroup) return false;
    }
    // Filter by name search
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      if (!monitor.name.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  if (!project) {
    return (
      <section className="w-full bg-white min-h-screen pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 text-center py-20">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proyecto no encontrado</h1>
          <a href="/proyectos" className="text-blue-600 hover:underline">
            ← Volver a proyectos
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back link */}
        <a href="/proyectos" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Todos los proyectos
        </a>

        {/* Project header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">{project.name}</h1>
            {project.season && (
              (() => {
                const { bg, text } = hashColor(project.id);
                return (
                  <span
                    className="text-sm font-medium px-3 py-1 rounded-full"
                    style={{ backgroundColor: bg, color: text }}
                  >
                    {project.season}
                  </span>
                );
              })()
            )}
          </div>
          {project.description && (
            <p className="text-gray-600 text-lg max-w-3xl">{project.description}</p>
          )}
        </div>

        {/* Project image */}
        {project.image && (
          <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden mb-10">
            <img
              src={project.image}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Monitors section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Equipo de Monitores</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar monitor..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
            </div>

            {/* Group filter buttons */}
            {namedGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
                    selectedGroupId === null
                      ? "bg-gray-800 text-white border-gray-800 shadow-md"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Todos
                </button>
                {namedGroups.map((group) => {
                  const { bg, text, border } = hashColor(group.id);
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id === selectedGroupId ? null : group.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2`}
                      style={
                        isSelected
                          ? { backgroundColor: text, color: "#fff", borderColor: text, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }
                          : { backgroundColor: bg, color: text, borderColor: border }
                      }
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active filters summary */}
          {(selectedGroupId || searchText.trim()) && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
              <span>
                {filteredMonitors.length} {filteredMonitors.length === 1 ? "monitor" : "monitores"}
                {" encontrado" + (filteredMonitors.length === 1 ? "" : "s")}
              </span>
              {(selectedGroupId || searchText.trim()) && (
                <button
                  onClick={() => {
                    setSelectedGroupId(null);
                    setSearchText("");
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Monitor cards */}
          {filteredMonitors.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredMonitors.map((monitor) => (
                <MonitorCard key={monitor.id} monitor={monitor}/>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">
              {project.monitors.length === 0
                ? "Este proyecto aún no tiene monitores asignados."
                : "No se encontraron monitores con los filtros seleccionados."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
