import { useCallback, useEffect, useState } from "react";
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

  return (
    <>
      <Hero
        title={settings["home.hero.title"]}
        subtitle={settings["home.hero.subtitle"]}
        image={settings["home.hero.image"]}
        loading={loading}
      />
      <AboutUs
        intro={settings["home.about.intro"]}
        bulletsJson={settings["home.about.bullets"]}
        image={settings["home.about.image"]}
        loading={loading}
      />
      <FeaturedProjects projects={projects} loading={loading} />
      <ActivitiesPreview />
      <MonitorsGallery monitors={monitors} loading={loading} />
    </>
  );
}