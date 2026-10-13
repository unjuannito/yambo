import {
    type RouteConfig,
    index,
    route,
    layout,
} from "@react-router/dev/routes";

export default [
    layout("routes/public/_layout.tsx", [
        index("routes/public/index.tsx"),
        route("actividades", "routes/public/actividades.tsx"),
        route("actividades/:id", "routes/public/actividad.$id.tsx"),
        route("contacto", "routes/public/contacto.tsx"),
        route("equipo", "routes/public/equipo.tsx"),
        route("proyectos", "routes/public/proyectos.tsx"),
        route("proyectos/:projectId", "routes/public/proyecto.tsx"),
        route("legal/:id", "routes/public/legal.$id.tsx"),
    ]),
    route("monitores", "routes/public/monitores.tsx"),
    layout("routes/dashboard/_layout.tsx", [
        // Inicio
        route("mi-espacio", "routes/dashboard/index.tsx"),
        route("mi-espacio/cuenta", "routes/dashboard/account/my-account.tsx"),

        // Administración
        route("mi-espacio/admin/usuarios", "routes/dashboard/users/index.tsx"),
        route("mi-espacio/admin/usuarios/:userId", "routes/dashboard/users/$userId/_layout.tsx", [
            index("routes/dashboard/users/$userId/index.tsx"),
            route("perfil", "routes/dashboard/users/$userId/perfil.tsx"),
            route("permisos", "routes/dashboard/users/$userId/permisos.tsx"),
            route("proyectos", "routes/dashboard/users/$userId/proyectos.tsx"),
            route("historial", "routes/dashboard/users/$userId/historial.tsx"),
        ]),
        route("mi-espacio/admin/perfiles", "routes/dashboard/profiles/index.tsx"),
        route(
            "mi-espacio/admin/invitaciones-nominativas",
            "routes/dashboard/nominative-invitations.tsx",
        ),
        route(
            "mi-espacio/admin/invitaciones",
            "routes/dashboard/invitations.tsx",
        ),
        route("mi-espacio/admin/pedidos", "routes/dashboard/orders/index.tsx"),
        route("mi-espacio/admin/configuracion", "routes/dashboard/settings/index.tsx"),
        route("mi-espacio/admin/pagina-principal", "routes/dashboard/settings/main-page.tsx"),
        route("mi-espacio/admin/seo", "routes/dashboard/seo/index.tsx"),
        route("mi-espacio/admin/legal", "routes/dashboard/legal/index.tsx"),
        route("mi-espacio/admin/informes", "routes/dashboard/reports/index.tsx"),
        route("mi-espacio/admin/guias", "routes/dashboard/guides/_layout.tsx", [
            index("routes/dashboard/guides/index.tsx"),
            route(":slug", "routes/dashboard/guides/$slug.tsx"),
        ]),

        // Proyectos
        route("mi-espacio/admin/equipo", "routes/dashboard/staff/index.tsx"),
        route("mi-espacio/proyectos", "routes/dashboard/projects/index.tsx"),
        route("mi-espacio/proyectos/:projectId", "routes/dashboard/projects/$projectId/_layout.tsx", [
            index("routes/dashboard/projects/$projectId/index.tsx"),
            route("equipos", "routes/dashboard/projects/$projectId/equipos.tsx"),
            route("personal", "routes/dashboard/projects/$projectId/personal.tsx"),
            route("padres", "routes/dashboard/projects/$projectId/padres.tsx"),
        ]),

        // Actividades
        route("mi-espacio/actividades", "routes/dashboard/activities/index.tsx"),

        // Pedidos de usuario
        route("mi-espacio/mis-pedidos", "routes/dashboard/orders/my-orders.tsx"),

        // Incidencias
        route("mi-espacio/incidencias", "routes/dashboard/issues/index.tsx"),
        route("mi-espacio/incidencias/:issueId", "routes/dashboard/issues/$issueId.tsx"),
        route("mi-espacio/admin/incidencias", "routes/dashboard/issues/admin.tsx"),

        // Merch (con CartContext)
        layout("routes/dashboard/_layout-merch.tsx", [
            route("mi-espacio/articulos", "routes/dashboard/merch/index.tsx"),
            route(
                "mi-espacio/articulos/colecciones",
                "routes/dashboard/merch/drops.tsx",
            ),
            route(
                "mi-espacio/articulos/:productId",
                "routes/dashboard/merch/product.tsx",
            ),
            route(
                "mi-espacio/articulos/nuevo",
                "routes/dashboard/merch/product-new.tsx",
            ),
            route(
                "mi-espacio/articulos/:productId/configurar",
                "routes/dashboard/merch/product-edit.tsx",
            ),
            route("mi-espacio/cesta", "routes/dashboard/merch/cart.tsx"),
        ]),
    ]),
    route("/design-system", "routes/design-system.tsx"),
    route("/login", "routes/login.tsx"),
    route("/register", "routes/register.tsx"),
    route("/project-role-invitation/:token", "routes/project-role-invitation.tsx"),
    route("/forgot-password", "routes/forgot-password.tsx"),
    route("/reset-password", "routes/reset-password.tsx"),

    // SEO resource routes
    route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
    route("robots.txt", "routes/robots[.]txt.tsx"),
] satisfies RouteConfig;
