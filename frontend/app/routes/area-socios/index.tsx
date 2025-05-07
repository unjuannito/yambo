import { useEffect, useState } from "react";
import type { Route } from "../+types/index";
import Hero from "../../components/home/Hero";
import AboutUs from "../../components/home/AboutUs";
import FeaturedProjects from "../../components/home/FeaturedProjects";
import ActivitiesPreview from "../../components/home/ActivitiesPreview";
import MonitorsGallery from "../../components/home/MonitorsGallery";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Yambo - Inicio" },
    { name: "description", content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo." },
  ];
}

export default function Index() {

  return (
    <main className="flex-1 pt-16">
      <Hero />
      <AboutUs />
      <FeaturedProjects />
      <ActivitiesPreview />
      <MonitorsGallery />
    </main>
  );
}