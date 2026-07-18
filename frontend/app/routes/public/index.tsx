import { useMemo } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import Hero from "~/components/home/Hero";
import AboutUs from "~/components/home/AboutUs";
import FeaturedProjects from "~/components/home/FeaturedProjects";
import ActivitiesPreview from "~/components/home/ActivitiesPreview";
import MonitorsGallery from "~/components/home/MonitorsGallery";
import {
    getHomeSettings,
    getFeaturedProjects,
    getStaff,
    getPublicActivities,
} from "~/services/publicService.server";
import { getSiteUrl } from "~/utils/env.server";
import { organizationJsonLd, webSiteJsonLd } from "~/utils/jsonld";
import type { Route } from "./+types";

export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    const siteUrl = data?.siteUrl ?? "";
    const title = t("public.homeTitle");
    const description = t("public.homeDescription");

    return [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: t("public.homeKeywords") },
        { tagName: "link", rel: "canonical", href: siteUrl },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: siteUrl },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Yambo" },
        { property: "og:locale", content: "es_ES" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "robots", content: "index, follow" },
        { name: "author", content: t("public.homeAuthor") },
        { "script:ld+json": organizationJsonLd(siteUrl) },
        { "script:ld+json": webSiteJsonLd(siteUrl) },
    ];
}

interface SectionConfig {
    id: string;
    visible: boolean;
    title: string;
}

export async function loader() {
    const [settings, projects, monitors, activities] = await Promise.all([
        getHomeSettings(),
        getFeaturedProjects(),
        getStaff(),
        getPublicActivities(),
    ]);
    return { settings, projects, monitors, activities, siteUrl: getSiteUrl() };
}

const SECTION_COMPONENTS: Record<
    string,
    (props: {
        title: string;
        sectionIndex: number;
        settings: Record<string, string>;
        projects: any;
        monitors: any;
        activities: any;
    }) => React.ReactNode
> = {
    hero: ({ settings }) => (
        <Hero
            key="hero"
            title={settings["home.hero.title"]}
            subtitle={settings["home.hero.subtitle"]}
            image={settings["home.hero.image"]}
        />
    ),
    about: ({ title, sectionIndex, settings }) => (
        <AboutUs
            key="about"
            title={title}
            sectionIndex={sectionIndex}
            intro={settings["home.about.intro"]}
            bulletsJson={settings["home.about.bullets"]}
            image={settings["home.about.image"]}
        />
    ),
    projects: ({ title, sectionIndex, projects }) => (
        <FeaturedProjects key="projects" title={title} sectionIndex={sectionIndex} projects={projects} />
    ),
    activities: ({ title, sectionIndex, activities }) => (
        <ActivitiesPreview key="activities" title={title} sectionIndex={sectionIndex} activities={activities} />
    ),
    monitors: ({ title, sectionIndex, monitors }) => (
        <MonitorsGallery key="monitors" title={title} sectionIndex={sectionIndex} monitors={monitors} />
    ),
};

export default function Index() {
    const { t } = useTranslation();
    const { settings, projects, monitors, activities } = useLoaderData<typeof loader>();

    const sections = useMemo<SectionConfig[]>(() => {
        const defaults: SectionConfig[] = [
            { id: "hero", visible: true, title: "" },
            { id: "about", visible: true, title: t("public.aboutSection") },
            { id: "projects", visible: true, title: t("public.featuredProjects") },
            { id: "activities", visible: true, title: t("public.activitiesTitle") },
            { id: "monitors", visible: true, title: t("public.ourTeam") },
        ];

        const raw = settings["home.sections.config"];
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as SectionConfig[];
                if (parsed.length > 0) return parsed;
            } catch {
                /* use defaults */
            }
        }
        return defaults;
    }, [settings, t]);

    const sharedProps = { settings, projects, monitors, activities };

    return (
        <>
            {sections.map((section, index) => {
                if (!section.visible) return null;
                const Component = SECTION_COMPONENTS[section.id];
                if (!Component) return null;
                return Component({ title: section.title, sectionIndex: index, ...sharedProps });
            })}
        </>
    );
}
