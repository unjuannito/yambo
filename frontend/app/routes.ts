import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("actividades", "routes/actividades.tsx"),
  route("contacto", "routes/contacto.tsx"),
  route("monitores", "routes/monitores.tsx"),
  route("proyectos", "routes/proyectos.tsx"),
] satisfies RouteConfig;
