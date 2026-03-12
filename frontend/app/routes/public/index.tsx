import { useMemo } from "react";
import { useLoaderData } from "react-router";
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
    const siteUrl = data?.siteUrl ?? "";
    const title = "Yambo - Asociación Juvenil en Alcobendas (Madrid)";
    const description =
        "Yambo es una asociación juvenil en Alcobendas (Madrid) dedicada al ocio educativo, tiempo libre y actividades para niños y adolescentes.";

    return [
        { title },
        { name: "description", content: description },
        {
            name: "keywords",
            content:
                "Yambo, asociación juvenil, Alcobendas, Madrid, ocio educativo, tiempo libre, actividades niños, actividades adolescentes, educación no formal, campamentos, proyectos juveniles, monitores",
        },
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
        { name: "author", content: "Juan Cañas Cañate, Javier Mateos Mata" },
        { "script:ld+json": organizationJsonLd(siteUrl) },
        { "script:ld+json": webSiteJsonLd(siteUrl) },
    ];
}

interface SectionConfig {
    id: string;
    visible: boolean;
    title: string;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
    { id: "hero", visible: true, title: "" },
    { id: "about", visible: true, title: "¿Qué es Yambo?" },
    { id: "projects", visible: true, title: "Proyectos Destacados" },
    { id: "activities", visible: true, title: "Actividades" },
    { id: "monitors", visible: true, title: "Nuestro Equipo" },
];

export async function loader() {
    const [settings, projects, monitors, activities] = await Promise.all([
        getHomeSettings(),
        getFeaturedProjects(),
        getStaff(),
        getPublicActivities(),
    ]);
    return { settings, projects, monitors, activities, siteUrl: getSiteUrl() };
}

export default function Index() {
    const { settings, projects, monitors, activities } = useLoaderData<typeof loader>();

    const sections = useMemo<SectionConfig[]>(() => {
        const raw = settings["home.sections.config"];
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as SectionConfig[];
                if (parsed.length > 0) return parsed;
            } catch {
                /* use defaults */
            }
        }
        return DEFAULT_SECTIONS;
    }, [settings]);

    const sectionTitle = (id: string) =>
        sections.find((s) => s.id === id)?.title || "";

    const renderSection = (section: SectionConfig) => {
        if (!section.visible) return null;

        switch (section.id) {
            case "hero":
                return (
                    <Hero
                        key="hero"
                        title={settings["home.hero.title"]}
                        subtitle={settings["home.hero.subtitle"]}
                        image={settings["home.hero.image"]}
                        loading={false}
                    />
                );
            case "about":
                return (
                    <AboutUs
                        key="about"
                        title={sectionTitle("about")}
                        intro={settings["home.about.intro"]}
                        bulletsJson={settings["home.about.bullets"]}
                        image={settings["home.about.image"]}
                        loading={false}
                    />
                );
            case "projects":
                return (
                    <FeaturedProjects
                        key="projects"
                        title={sectionTitle("projects")}
                        projects={projects}
                        loading={false}
                    />
                );
            case "activities":
                return (
                    <ActivitiesPreview
                        key="activities"
                        title={sectionTitle("activities")}
                        activities={activities}
                        loading={false}
                    />
                );
            case "monitors":
                return (
                    <MonitorsGallery
                        key="monitors"
                        title={sectionTitle("monitors")}
                        monitors={monitors}
                        loading={false}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            {sections.map(renderSection)}
        </>
    );
}
