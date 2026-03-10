import { useState } from "react";
import { useLoaderData } from "react-router";
import { getStaff, getActiveProjects } from "~/services/publicService.server";
import type { StaffMember, ActiveProject } from "~/services/publicService";
import MonitorCard from "~/components/home/MonitorCard";
import { hashColor } from "~/utils/hashColor";
import { getSiteUrl } from "~/utils/env.server";
import { collectionPageJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import type { Route } from "./+types/monitores";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export function meta({ data }: Route.MetaArgs) {
  const siteUrl = data?.siteUrl ?? "";
  const title = "Yambo - Equipo de Monitores | Asociación Juvenil en Alcobendas";
  const description = "Conoce al equipo de monitores de Yambo en Alcobendas (Madrid). Profesionales dedicados al ocio educativo y tiempo libre para niños y adolescentes.";

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: "monitores Yambo, equipo educativo, Alcobendas, Madrid, educadores tiempo libre, ocio educativo" },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/monitores` },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: `${siteUrl}/monitores` },
    { property: "og:type", content: "website" },
    { name: "robots", content: "index, follow" },
    { "script:ld+json": collectionPageJsonLd({ name: title, description, url: `${siteUrl}/monitores` }) },
    { "script:ld+json": breadcrumbJsonLd([
        { name: "Inicio", url: siteUrl },
        { name: "Monitores", url: `${siteUrl}/monitores` },
    ]) },
  ];
}

export async function loader() {
  const [monitors, projects] = await Promise.all([
    getStaff(),
    getActiveProjects(),
  ]);
  return { monitors, projects, siteUrl: getSiteUrl() };
}

export default function Monitores() {
  const { monitors, projects } = useLoaderData<typeof loader>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  // Derive unique project names from monitors' groups for filtering
  const projectsWithMonitors = projects.filter((p) =>
    monitors.some((m) => m.groups.some((g) => g.projectName === p.name))
  );

  const filteredMonitors = monitors.filter((monitor) => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        const hasProject = monitor.groups.some(g => g.projectName === project.name);
        if (!hasProject) return false;
      }
    }
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      if (!monitor.name.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  return (
    <section className="w-full bg-white min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Monitores</h1>
        <p className="text-gray-600 mb-10">
          Conoce al equipo de monitores que hacen posible nuestros proyectos.
        </p>

        {/* Filters */}
        {monitors.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
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

            {/* Project filter */}
            {projectsWithMonitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedProjectId === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Todos
                </button>
                {projectsWithMonitors.map((project) => {
                  const { bg, text, border } = hashColor(project.id);
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id === selectedProjectId ? null : project.id)}
                      className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all border"
                      style={
                        isSelected
                          ? { backgroundColor: text, color: "#fff", borderColor: text }
                          : { backgroundColor: bg, color: text, borderColor: border }
                      }
                    >
                      {project.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active filter summary */}
        {(selectedProjectId || searchText.trim()) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
            <span>
              {filteredMonitors.length} {filteredMonitors.length === 1 ? "monitor" : "monitores"}
              {" encontrado" + (filteredMonitors.length === 1 ? "" : "s")}
            </span>
            <button
              onClick={() => { setSelectedProjectId(null); setSearchText(""); }}
              className="text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Monitor grid */}
        {filteredMonitors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredMonitors.map((monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">
            {monitors.length === 0
              ? "No hay monitores disponibles en este momento."
              : "No se encontraron monitores con los filtros seleccionados."}
          </p>
        )}
      </div>
    </section>
  );
}
