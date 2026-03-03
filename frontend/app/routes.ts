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
        route("contacto", "routes/public/contacto.tsx"),
        route("monitores", "routes/public/monitores.tsx"),
        route("proyectos", "routes/public/proyectos.tsx"),
        route("proyectos/:projectId", "routes/public/proyecto.tsx"),
    ]),
    layout("routes/dashboard/_layout.tsx", [
        // Inicio
        route("mi-espacio", "routes/dashboard/index.tsx"),
        route("mi-espacio/cuenta", "routes/dashboard/account/my-account.tsx"),

        // Administración
        route("mi-espacio/admin/usuarios", "routes/dashboard/users/index.tsx"),
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
        route("mi-espacio/admin/informes", "routes/dashboard/reports/index.tsx"),

        // Proyectos
        route("mi-espacio/proyectos", "routes/dashboard/projects/index.tsx"),

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
            route("mi-espacio/merch", "routes/dashboard/merch/index.tsx"),
            route(
                "mi-espacio/merch/drops",
                "routes/dashboard/merch/drops.tsx",
            ),
            route(
                "mi-espacio/merch/:productId",
                "routes/dashboard/merch/product.tsx",
            ),
            route(
                "mi-espacio/merch/nuevo",
                "routes/dashboard/merch/product-new.tsx",
            ),
            route(
                "mi-espacio/merch/:productId/configurar",
                "routes/dashboard/merch/product-edit.tsx",
            ),
            route("mi-espacio/cesta", "routes/dashboard/merch/cart.tsx"),
        ]),
    ]),
    route("/login", "routes/login.tsx"),
    route("/register", "routes/register.tsx"),
    route("/forgot-password", "routes/forgot-password.tsx"),
    route("/reset-password", "routes/reset-password.tsx"),

    // SEO resource routes (no component – return raw responses)
    route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
    route("robots.txt", "routes/robots[.]txt.tsx"),
] satisfies RouteConfig;
