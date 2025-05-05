import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Actividades" },
    { name: "Yambo - Actividades", content: "Yambo - Actividades" },
  ];
}

export default function Home() {
  return <h1>Actividades</h1>;
}
