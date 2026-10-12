import { useState } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getProjectDetail } from "~/services/publicService.server";
import type { ProjectDetail, StaffMember, ProjectGroupDetail } from "~/services/publicService";
import StaffCard from "~/components/StaffCard";
import { projectColor } from "~/utils/projectColor";
import type { Route } from "./+types/proyecto";
import { getSiteUrl } from "~/utils/env.server";
import { projectJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const project = await getProjectDetail(params.projectId!);
    return { project, siteUrl: getSiteUrl() };
  } catch {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
}

export function meta({ data }: Route.MetaArgs) {
  const { t } = useTranslation();
  const project = data?.project;
  const seo = project?.seo;
  const siteUrl = data?.siteUrl ?? "";

  const title = project ? `Yambo - ${project.name}` : t('public.projectNotFound');
  const description = seo?.metaDescription ?? project?.description ?? t('common.description');
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
          { name: t('nav.home'), url: siteUrl },
          { name: t('public.projectsTitle'), url: `${siteUrl}/proyectos` },
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
  const { t } = useTranslation();
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
      <section className="w-full bg-yambo-white min-h-screen pt-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 text-center py-20">
          <p className="text-6xl mb-4">-</p>
          <h1 className="text-2xl font-bold text-yambo-black mb-4">{t('public.projectNotFound')}</h1>
          <a href="/proyectos" className="text-yambo-green-600 hover:underline font-semibold">
            {t('public.projectBackToProjects')}
          </a>
        </div>
      </section>
    );
  }

  const pc = projectColor(project.id, project.signatureColor);
  const coordinationEmail = project.coordinationEmail?.trim();

  return (
    <section
      className="w-full bg-gradient-to-b from-yambo-purple-50/30 to-yambo-white min-h-screen pt-12 pb-16"
      style={{
        '--pc-text': pc.text,
        '--pc-text-hover': pc.textHover,
        '--pc-bg': pc.bg,
        '--pc-border': pc.border,
      } as React.CSSProperties}
    >
      <div className="max-w-8xl mx-auto px-4">
        <a href="/proyectos" className="inline-flex items-center gap-1 text-sm font-semibold mb-6 transition-colors [color:var(--pc-text)] hover:[color:var(--pc-text-hover)]">
          {t('public.projectBackToList')}
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
            <p className="text-gray-500 text-lg max-w-3xl text-justify whitespace-pre-line">{project.description}</p>
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

        {/* Coordination email (project-specific, independent from the staff list) */}
        {coordinationEmail && (
          <div className="mb-10 fade-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="text-2xl font-bold text-yambo-black mb-4 font-display">{t('public.projectCoordinationEmail')}</h2>
            <div className="inline-flex items-start gap-4 rounded-3xl border bg-white p-5 shadow-sm [border-color:var(--pc-border)]">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center [background-color:var(--pc-bg)]">
                <FontAwesomeIcon icon={faEnvelope} className="w-6 h-6 [color:var(--pc-text)]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-1">{t('public.projectCoordinationEmailDesc')}</p>
                <a
                  href={`mailto:${coordinationEmail}`}
                  className="text-yambo-black font-semibold break-all text-base transition-colors hover:[color:var(--pc-text-hover)]"
                >
                  {coordinationEmail}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Coordinators */}
        {filteredCoordinators.length > 0 && (
          <div className="mb-10 fade-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-2xl font-bold text-yambo-black mb-6 font-display">{t('public.projectCoordination')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 stagger">
              {filteredCoordinators.map((coord) => (
                <StaffCard key={coord.id} member={coord} projectName={project.name} />
              ))}
            </div>
          </div>
        )}

        {/* Monitors */}
        <div className="mb-6 fade-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl font-bold text-yambo-black mb-6 font-display">{t('public.projectMonitorsTeam')}</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('public.projectSearch')}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 outline-none bg-white shadow-sm transition-all"
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
            </div>

            {namedGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedGroupId === null
                      ? "bg-yambo-black text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {t('common.all')}
                </button>
                {namedGroups.map((group) => {
                  const colors = projectColor(group.id);
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <button type="button"
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
                {t('public.projectFilteredResult', { count: filteredMonitors.length })}
              </span>
              <button type="button"
                onClick={() => { setSelectedGroupId(null); setSearchText(""); }}
                className="text-yambo-green-600 hover:underline font-medium transition-colors hover:text-yambo-green-700"
              >
                {t('public.projectClearFilters')}
              </button>
            </div>
          )}

          {filteredMonitors.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 stagger">
              {filteredMonitors.map((monitor) => (
                <StaffCard key={monitor.id} member={monitor} projectName={project.name} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">-</p>
              <p className="text-gray-400">
                {monitors.length === 0
                  ? t('public.projectNoMonitors')
                  : t('public.projectNoMonitorsFiltered')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
