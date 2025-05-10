import type { Route } from "./+types/notificaciones";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Yambo - Área Socios - Mis Notificaciones" }];
}

export default function Actividades() {
  return <div className="text-gray-700">Aquí verás tus Notificaciones...</div>;
}
