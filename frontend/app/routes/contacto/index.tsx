import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Contacto" },
    { name: "Yambo - Contacto", content: "Yambo - Contacto" },
  ];
}

export default function Home() {
  return <h1>Contacto</h1>;
}
