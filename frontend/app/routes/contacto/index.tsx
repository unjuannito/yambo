import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Contacto" },
    { name: "Yambo - Contacto", content: "Yambo - Contacto" },
  ];
}

export default function Home() {
  return <h1>Contacto</h1>;
}
