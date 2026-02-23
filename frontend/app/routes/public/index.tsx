import { useCallback, useEffect, useMemo, useState } from "react";
import Hero from "~/components/home/Hero";
import AboutUs from "~/components/home/AboutUs";
import FeaturedProjects from "~/components/home/FeaturedProjects";
import ActivitiesPreview from "~/components/home/ActivitiesPreview";
import MonitorsGallery from "~/components/home/MonitorsGallery";
import { publicService } from "~/services/publicService";
import type { HomeSettings, FeaturedProject, Monitor } from "~/services/publicService";
import type { Route } from "./+types";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Yambo - Inicio" },
    { name: "description", content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo." },
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
  { id: "monitors", visible: true, title: "Equipo de Monitores" },
];

export default function Index() {
  const [settings, setSettings] = useState<HomeSettings>({});
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [settingsData, projectsData, monitorsData] = await Promise.all([
        publicService.getHomeSettings(),
        publicService.getFeaturedProjects(),
        publicService.getMonitors(),
      ]);
      setSettings(settingsData);
      setProjects(projectsData);
      setMonitors(monitorsData);
    } catch (error) {
      console.error("Failed to load public page data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sections = useMemo<SectionConfig[]>(() => {
    const raw = settings["home.sections.config"];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SectionConfig[];
        if (parsed.length > 0) return parsed;
      } catch { /* use defaults */ }
    }
    return DEFAULT_SECTIONS;
  }, [settings]);

  const sectionTitle = (id: string) =>
    sections.find(s => s.id === id)?.title || "";

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
            loading={loading}
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
            loading={loading}
          />
        );
      case "projects":
        return (
          <FeaturedProjects
            key="projects"
            title={sectionTitle("projects")}
            projects={projects}
            loading={loading}
          />
        );
      case "activities":
        return (
          <ActivitiesPreview
            key="activities"
            title={sectionTitle("activities")}
          />
        );
      case "monitors":
        return (
          <MonitorsGallery
            key="monitors"
            title={sectionTitle("monitors")}
            monitors={monitors}
            loading={loading}
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