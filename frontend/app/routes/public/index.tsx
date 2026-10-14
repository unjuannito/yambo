import { useMemo } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import Hero from "~/components/home/Hero";
import AboutUs from "~/components/home/AboutUs";
import FeaturedProjects from "~/components/home/FeaturedProjects";
import ActivitiesPreview from "~/components/home/ActivitiesPreview";
import StaffGallery from "~/components/home/StaffGallery";
import {
    getHomeSettings,
    getFeaturedProjects,
    getStaff,
    getPublicActivities,
    getContactSettings,
} from "~/services/publicService.server";
import { getSiteUrl } from "~/utils/env.server";
import { organizationJsonLd, webSiteJsonLd } from "~/utils/jsonld";
import { buildMeta } from "~/utils/seo";
import type { Route } from "./+types";

export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    const siteUrl = data?.siteUrl ?? "";
    const title = t("public.homeTitle");
    const description = t("public.homeDescription");
    const instagram = data?.contactSettings?.["contact.instagram"];
    const tiktok = data?.contactSettings?.["contact.tiktok"];

    return [
        ...buildMeta({ siteUrl, path: "", title, description }),
        { "script:ld+json": organizationJsonLd(siteUrl, { instagram, tiktok }) },
        { "script:ld+json": webSiteJsonLd(siteUrl) },
    ];
}

interface SectionConfig {
    id: string;
    visible: boolean;
    title: string;
}

export async function loader() {
    const [settings, contactSettings, projects, staff, activities] = await Promise.all([
        getHomeSettings(),
        getContactSettings(),
        getFeaturedProjects(),
        getStaff(),
        getPublicActivities(),
    ]);
    return { settings, contactSettings, projects, staff, activities, siteUrl: getSiteUrl() };
}

const SECTION_COMPONENTS: Record<
    string,
    (props: {
        title: string;
        sectionIndex: number;
        settings: Record<string, string>;
        projects: any;
        staff: any;
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
    staff: ({ title, sectionIndex, staff }) => (
        <StaffGallery key="staff" title={title} sectionIndex={sectionIndex} staff={staff} />
    ),
};

export default function Index() {
    const { t } = useTranslation();
    const { settings, projects, staff, activities } = useLoaderData<typeof loader>();

    const sections = useMemo<SectionConfig[]>(() => {
        const defaults: SectionConfig[] = [
            { id: "hero", visible: true, title: "" },
            { id: "about", visible: true, title: t("public.aboutSection") },
            { id: "projects", visible: true, title: t("public.featuredProjects") },
            { id: "activities", visible: true, title: t("public.activitiesTitle") },
            { id: "staff", visible: true, title: t("public.ourTeam") },
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

    const sharedProps = { settings, projects, staff, activities };

    return (
        <>
            {sections.map((section, index) => {
                if (!section.visible) return null;
                // "monitors" is the former id of the staff section (configs saved before the rename)
                const Component = SECTION_COMPONENTS[section.id === "monitors" ? "staff" : section.id];
                if (!Component) return null;
                return Component({ title: section.title, sectionIndex: index, ...sharedProps });
            })}
        </>
    );
}
