import type { Route } from "../+types/proyectos";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Proyectos" },
    { name: "Yambo - Proyectos", content: "Yambo - Proyectos" },
  ];
}

export default function Home() {
  return <h1>Proyectos</h1>;
}
