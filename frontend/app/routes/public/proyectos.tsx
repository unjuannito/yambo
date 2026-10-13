import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getActiveProjects } from "~/services/publicService.server";
import type { ActiveProject } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";
import { getSiteUrl } from "~/utils/env.server";
import { collectionPageJsonLd, breadcrumbJsonLd, itemListJsonLd } from "~/utils/jsonld";
import { buildMeta } from "~/utils/seo";
import type { Route } from "./+types/proyectos";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder } from "@fortawesome/free-solid-svg-icons";

export function meta({ data }: Route.MetaArgs) {
  const { t } = useTranslation();
  const siteUrl = data?.siteUrl ?? "";
  const title = t('public.projectsPageTitle');
  const description = t('public.projectsMetaDescription');

  return [
    ...buildMeta({ siteUrl, path: "/proyectos", title, description }),
    { "script:ld+json": collectionPageJsonLd({ name: title, description, url: `${siteUrl}/proyectos` }) },
    { "script:ld+json": breadcrumbJsonLd([
        { name: t('nav.home'), url: siteUrl },
        { name: t('public.projectsTitle'), url: `${siteUrl}/proyectos` },
    ]) },
    { "script:ld+json": itemListJsonLd((data?.projects ?? []).map((p) => ({ name: p.name, url: `${siteUrl}/proyectos/${p.id}` }))) },
  ];
}

export async function loader() {
  const projects = await getActiveProjects();
  return { projects, siteUrl: getSiteUrl() };
}

export default function Proyectos() {
  const { t } = useTranslation();
  const { projects } = useLoaderData<typeof loader>();

  return (
    <section className="w-full bg-gradient-to-b from-yambo-purple-50/30 to-yambo-white min-h-screen pt-12 pb-16">
      <div className="max-w-8xl mx-auto px-4">
        <div className="fade-up">
          <h1 className="text-4xl font-extrabold text-yambo-black mb-2 font-display">{t('public.projectsTitle')}</h1>
          <p className="text-gray-500 mb-10">
            {t('public.projectsSubtitle')}
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 stagger">
            {projects.map((project, idx) => {
              const pc = projectColor(project.id, project.signatureColor);
              return (
              <a
                key={project.id}
                href={`/proyectos/${project.id}`}
                className="group fade-up"
                style={{
                  animationDelay: `${idx * 100}ms`,
                  '--pc-text': pc.text,
                  '--pc-text-hover': pc.textHover,
                  '--pc-bg': pc.bg,
                  '--pc-border': pc.border,
                } as React.CSSProperties}
              >
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover-lift transition-all"
                  style={project.signatureColor ? { borderLeftWidth: '4px', borderLeftColor: project.signatureColor } : undefined}
                >
                  {project.image ? (
                    <div className="w-full h-48 overflow-hidden">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={project.image}
                        alt={project.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full h-48 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, var(--pc-bg), var(--pc-border))' }}
                    >
                      <FontAwesomeIcon icon={faFolder} className="w-12 h-12 opacity-30 text-white" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold transition-colors [color:var(--pc-text)] group-hover:[color:var(--pc-text-hover)]">
                        {project.name}
                      </h3>
                      {project.season && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full [background-color:var(--pc-bg)] [color:var(--pc-text)]">
                          {project.season}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-gray-500 text-sm line-clamp-3 mb-3">
                        {project.description}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold transition-colors [color:var(--pc-text)] group-hover:[color:var(--pc-text-hover)]">
                      {t('public.projectsView')}
                    </span>
                  </div>
                </div>
              </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">-</p>
            <p className="text-gray-400 text-lg">
              {t('public.projectsEmpty')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
