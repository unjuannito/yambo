import type { Route } from "./+types/users";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Usuarios" },
    { name: "Yambo - Usuarios", content: "Yambo - Usuarios" },
  ];
}

export default function Home() {
  return <h1>Usuarios</h1>;
}
