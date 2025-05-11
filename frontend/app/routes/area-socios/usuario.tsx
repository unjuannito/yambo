import type { Route } from "./+types/usuario";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Usuario" },
    { name: "Yambo - Usuario", content: "Yambo - Usuario" },
  ];
}

export default function Home() {
  return <h1>Usuario</h1>;
}
