// File: app/routes/area-socios/actividades.tsx
import type { Route } from "./+types/actividades";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Yambo - Área Socios - Mis Actividades" }];
}

export default function Actividades() {
  return <div className="text-gray-700">Aquí verás tus actividades...</div>;
}
