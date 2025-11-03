import type { Route } from "./+types/my-account";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Mi usuario" },
    { name: "Yambo - Usuario", content: "Yambo - Usuario" },
  ];
}

export default function Home() {
  return <h1>Usuario</h1>;
}
