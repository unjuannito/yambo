import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("actividades", "routes/actividades/index.tsx"),
  route("contacto", "routes/contacto/index.tsx"),
  route("monitores", "routes/monitores/index.tsx"),
  route("proyectos", "routes/proyectos/index.tsx"),
] satisfies RouteConfig;
