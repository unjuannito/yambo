import { useState } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getStaff, getActiveProjects } from "~/services/publicService.server";
import type { StaffMember, ActiveProject } from "~/services/publicService";
import MonitorCard from "~/components/MonitorCard";
import { projectColor } from "~/utils/projectColor";
import { getSiteUrl } from "~/utils/env.server";
import { collectionPageJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import type { Route } from "./+types/monitores";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export function meta({ data }: Route.MetaArgs) {
  const { t } = useTranslation();
  const siteUrl = data?.siteUrl ?? "";
  const title = t('public.monitorsPageTitle');
  const description = t('public.monitorsMetaDescription');

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: t('public.monitorsKeywords') },
    { tagName: "link", rel: "canonical", href: `${siteUrl}/monitores` },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: `${siteUrl}/monitores` },
    { property: "og:type", content: "website" },
    { name: "robots", content: "index, follow" },
    { "script:ld+json": collectionPageJsonLd({ name: title, description, url: `${siteUrl}/monitores` }) },
    { "script:ld+json": breadcrumbJsonLd([
        { name: t('nav.home'), url: siteUrl },
        { name: t('public.monitorsTitle'), url: `${siteUrl}/monitores` },
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
  const { t } = useTranslation();
  const { monitors, projects } = useLoaderData<typeof loader>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

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
    <section className="w-full bg-gradient-to-b from-yambo-green-50/30 to-yambo-white min-h-screen pt-12 pb-16">
      <div className="max-w-8xl mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-yambo-black mb-2 font-display fade-up">{t('public.monitorsTitle')}</h1>
        <p className="text-gray-500 text-lg mb-10 fade-up" style={{ animationDelay: "0.05s" }}>
          {t('public.monitorsSubtitle')}
        </p>

        {/* Filters */}
        {monitors.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 fade-up" style={{ animationDelay: "0.1s" }}>
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('public.monitorsSearch')}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 outline-none bg-white shadow-sm transition-all"
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
            </div>

            {/* Project filter */}
            {projectsWithMonitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedProjectId === null
                      ? "bg-yambo-black text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {t('common.all')}
                </button>
                {projectsWithMonitors.map((project) => {
                  const colors = projectColor(project.id, project.signatureColor);
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id === selectedProjectId ? null : project.id)}
                      className="px-4 py-2 rounded-full text-sm font-semibold transition-all border hover:brightness-90"
                      style={
                        isSelected
                          ? { backgroundColor: colors.text, color: "#fff", borderColor: colors.text, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }
                          : { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }
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
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <span>
              {t('public.monitorsFilteredResult', { count: filteredMonitors.length })}
            </span>
            <button
              onClick={() => { setSelectedProjectId(null); setSearchText(""); }}
                className="text-yambo-green-600 hover:underline font-medium transition-colors hover:text-yambo-green-700"
            >
              {t('public.monitorsClearFilters')}
            </button>
          </div>
        )}

        {/* Monitor grid */}
        {filteredMonitors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 stagger">
            {filteredMonitors.map((monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">-</p>
            <p className="text-gray-400">
              {monitors.length === 0
                ? t('public.monitorsEmpty')
                : t('public.monitorsEmptyFiltered')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
