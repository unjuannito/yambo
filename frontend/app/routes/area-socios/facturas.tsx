import type { Route } from "./+types/facturas";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Facturas" },
    { name: "Yambo - Facturas", content: "Yambo - Facturas" },
  ];
}

export default function Home() {
  return <h1>Aquí verás tus facturas</h1>;
}
