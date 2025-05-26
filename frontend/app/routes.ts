import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/index.tsx"),
    route("actividades", "routes/actividades.tsx"),
    route("contacto", "routes/contacto.tsx"),
    route("monitores", "routes/monitores.tsx"),
    route("proyectos", "routes/proyectos.tsx"),
    // ...other non-area-socios routes
  ]),
  layout("routes/area-socios/_layout.tsx", [
    route("area-socios", "routes/area-socios/index.tsx"),
    route("area-socios/actividades", "routes/area-socios/actividades.tsx"),
    route("area-socios/facturas", "routes/area-socios/facturas.tsx"),
    route("area-socios/usuario", "routes/area-socios/usuario.tsx"),
    route("area-socios/notificaciones", "routes/area-socios/notificaciones.tsx")    
    // ...other area-socios routes
  ]),
  route("area-socios/login", "routes/area-socios/login.tsx"),

] satisfies RouteConfig;