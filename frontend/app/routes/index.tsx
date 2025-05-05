import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Inicio" },
    { name: "Yambo - Inicio", content: "Yambo - Inicio" },
  ];
}

export default function Home() {
  return (
    <nav>
        <a href="/">Inicio</a>
        <a href="/proyectos">Proyectos</a>
        <a href="/actividades">Actividades</a>
        <a href="/monitores">Monitores</a>
    </nav>
  );
}
