import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Actividades" },
    { name: "Yambo - Actividades", content: "Yambo - Actividades" },
  ];
}

export default function Home() {
  return <h1>Actividades</h1>;
}
