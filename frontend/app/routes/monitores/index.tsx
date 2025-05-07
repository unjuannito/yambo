import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Monitores" },
    { name: "Yambo - Monitores", content: "Yambo - Monitores" },
  ];
}

export default function Home() {
  return <h1>Monitores</h1>;
}
