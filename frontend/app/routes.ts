import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/public/_layout.tsx", [
    index("routes/public/index.tsx"),
    route("actividades", "routes/public/actividades.tsx"),
    route("contacto", "routes/public/contacto.tsx"),
    route("monitores", "routes/public/monitores.tsx"),
    route("proyectos", "routes/public/proyectos.tsx"),
  ]),
  layout("routes/dashbord/_layout.tsx", [
    route("mi-espacio", "routes/dashbord/index.tsx"),
    route("mi-espacio/mi-cuenta", "routes/dashbord/my-account.tsx"),
    // Admin pages
    route("mi-espacio/usuarios", "routes/dashbord/users.tsx"),
  ]),
  route("/login", "routes/login.tsx"),
  route("/register", "routes/register.tsx")

] satisfies RouteConfig;