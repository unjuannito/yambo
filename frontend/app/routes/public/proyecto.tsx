import { useState } from "react";
import { useLoaderData } from "react-router";
import { getProjectDetail } from "~/services/publicService.server";
import type { ProjectDetail, StaffMember, ProjectGroupDetail } from "~/services/publicService";
import MonitorCard from "~/components/home/MonitorCard";
import { projectColor } from "~/utils/projectColor";
import type { Route } from "./+types/proyecto";
import { getSiteUrl } from "~/utils/env.server";
import { projectJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const project = await getProjectDetail(params.projectId!);
    return { project, siteUrl: getSiteUrl() };
  } catch {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
}

export function meta({ data }: Route.MetaArgs) {
  const project = data?.project;
  const seo = project?.seo;
  const siteUrl = data?.siteUrl ?? "";

  const title = project ? `Yambo - ${project.name}` : "Yambo - Proyecto";
  const description = seo?.metaDescription ?? project?.description ?? "Detalle del proyecto";
  const pageUrl = project ? `${siteUrl}/proyectos/${project.id}` : `${siteUrl}/proyectos`;

  return [
    { title },
    { name: "description", content: description },
    ...(seo?.keywords?.length ? [{ name: "keywords", content: seo.keywords.join(", ") }] : []),
    { tagName: "link", rel: "canonical", href: pageUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: seo?.ogDescription ?? description },
    { property: "og:url", content: pageUrl },
    { property: "og:type", content: "website" },
    { name: "robots", content: "index, follow" },
    ...(project?.image ? [{ property: "og:image", content: project.image }] : []),
    ...(project ? [
      { "script:ld+json": projectJsonLd(project, siteUrl) },
      { "script:ld+json": breadcrumbJsonLd([
          { name: "Inicio", url: siteUrl },
          { name: "Proyectos", url: `${siteUrl}/proyectos` },
          { name: project.name, url: pageUrl },
      ]) },
    ] : []),
  ];
}

function getProjectRole(member: StaffMember, projectName: string): 'COORDINATOR' | 'MONITOR' | 'BOTH' {
  const projectGroups = member.groups.filter(g => g.projectName === projectName);
  const isCoord = projectGroups.some(g => g.role === 'COORDINATOR');
  const isMon = projectGroups.some(g => g.role === 'MONITOR');
  if (isCoord && isMon) return 'BOTH';
  if (isCoord) return 'COORDINATOR';
  return 'MONITOR';
}

export default function Proyecto() {
  const { project } = useLoaderData<typeof loader>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const namedGroups: ProjectGroupDetail[] = project?.groups.filter(g => g.name) ?? [];
  const allStaff = project?.staff ?? [];
  const coordinators = allStaff.filter(m => {
    const role = getProjectRole(m, project?.name ?? "");
    return role === 'COORDINATOR' || role === 'BOTH';
  });
  const monitors = allStaff.filter(m => {
    const role = getProjectRole(m, project?.name ?? "");
    return role === 'MONITOR' || role === 'BOTH';
  });

  const filteredMonitors: StaffMember[] = monitors.filter((monitor) => {
    if (selectedGroupId) {
      const hasGroup = monitor.groups.some(g => g.id === selectedGroupId);
      if (!hasGroup) return false;
    }
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      if (!monitor.name.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  const filteredCoordinators: StaffMember[] = coordinators.filter((c) => {
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      if (!c.name.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  if (!project) {
    return (
      <section className="w-full bg-yambo-white min-h-screen pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 text-center py-20">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-yambo-black mb-4">Proyecto no encontrado</h1>
          <a href="/proyectos" className="text-yambo-green-600 hover:underline font-semibold">
            ← Volver a proyectos
          </a>
        </div>
      </section>
    );
  }

  const pc = projectColor(project.id, project.signatureColor);

  return (
    <section
      className="w-full bg-gradient-to-b from-yambo-purple-50/30 to-yambo-white min-h-screen pt-24 pb-16"
      style={{
        '--pc-text': pc.text,
        '--pc-text-hover': pc.textHover,
        '--pc-bg': pc.bg,
        '--pc-border': pc.border,
      } as React.CSSProperties}
    >
      <div className="max-w-6xl mx-auto px-4">
        <a href="/proyectos" className="inline-flex items-center gap-1 text-sm font-semibold mb-6 transition-colors [color:var(--pc-text)] hover:[color:var(--pc-text-hover)]">
          ← Todos los proyectos
        </a>

        {/* Project header */}
        <div className="mb-8 fade-up">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold text-yambo-black font-display"
              style={project.signatureColor ? { textDecorationLine: 'underline', textDecorationColor: project.signatureColor, textUnderlineOffset: '6px', textDecorationThickness: '3px' } : undefined}
            >{project.name}</h1>
            {project.season && (
              <span className="text-sm font-semibold px-3 py-1 rounded-full [background-color:var(--pc-bg)] [color:var(--pc-text)]">
                {project.season}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-gray-500 text-lg max-w-3xl">{project.description}</p>
          )}
        </div>

        {/* Project image */}
        {project.image && (
          <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-10 shadow-lg fade-up" style={{ animationDelay: "0.1s" }}>
            <img
              src={project.image}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Coordinators */}
        {filteredCoordinators.length > 0 && (
          <div className="mb-10 fade-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-2xl font-bold text-yambo-black mb-6 font-display">Coordinación</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 stagger">
              {filteredCoordinators.map((coord) => (
                <MonitorCard key={coord.id} monitor={coord} projectName={project.name} />
              ))}
            </div>
          </div>
        )}

        {/* Monitors */}
        <div className="mb-6 fade-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl font-bold text-yambo-black mb-6 font-display">Equipo de Monitores</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar monitor..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 outline-none bg-white shadow-sm transition-all"
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
            </div>

            {namedGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedGroupId === null
                      ? "bg-yambo-black text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Todos
                </button>
                {namedGroups.map((group) => {
                  const colors = projectColor(group.id);
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id === selectedGroupId ? null : group.id)}
                      className="px-4 py-2 rounded-full text-sm font-semibold transition-all border hover:brightness-90"
                      style={
                        isSelected
                          ? { backgroundColor: colors.text, color: "#fff", borderColor: colors.text, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }
                          : { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }
                      }
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {(selectedGroupId || searchText.trim()) && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
              <span>
                {filteredMonitors.length} {filteredMonitors.length === 1 ? "monitor" : "monitores"}
                {" encontrado" + (filteredMonitors.length === 1 ? "" : "s")}
              </span>
              <button
                onClick={() => { setSelectedGroupId(null); setSearchText(""); }}
                className="text-yambo-green-600 hover:underline font-medium transition-colors hover:text-yambo-green-700"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {filteredMonitors.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 stagger">
              {filteredMonitors.map((monitor) => (
                <MonitorCard key={monitor.id} monitor={monitor} projectName={project.name} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">👥</p>
              <p className="text-gray-400">
                {monitors.length === 0
                  ? "Este proyecto aún no tiene monitores asignados."
                  : "No se encontraron monitores con los filtros seleccionados."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
