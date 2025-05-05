import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Monitores" },
    { name: "Yambo - Monitores", content: "Yambo - Monitores" },
  ];
}

export default function Home() {
  return <h1>Monitores</h1>;
}
