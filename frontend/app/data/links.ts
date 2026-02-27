import { PRODUCT_LINK_NAME, PRODUCT_NAME } from "~/utils/constants";

export interface Permission {
    obj: string;
    action: string;
}

export interface Link {
    name: string;
    href: string;
    label: string;
    need: Permission | null;
}

const LINKS_MAP: Link[] = [
    // General
    {
        name: "home",
        href: "/mi-espacio",
        label: "Dashboard",
        need: null,
    },
    {
        name: "myAccount",
        href: "/mi-espacio/cuenta",
        label: "Mi Cuenta",
        need: null,
    },

    // Administración
    {
        name: "settings",
        href: "/mi-espacio/admin/configuracion",
        label: "Configuración",
        need: { obj: "settings", action: "read" },
    },
    {
        name: "mainPage",
        href: "/mi-espacio/admin/pagina-principal",
        label: "Página Principal",
        need: { obj: "settings", action: "update" },
    },
    {
        name: "users",
        href: "/mi-espacio/admin/usuarios",
        label: "Usuarios",
        need: { obj: "user", action: "read" },
    },
    {
        name: "profiles",
        href: "/mi-espacio/admin/perfiles",
        label: "Perfiles",
        need: { obj: "profile", action: "read" },
    },
    {
        name: "nominativeInvitations",
        href: "/mi-espacio/admin/invitaciones-nominativas",
        label: "Invitaciones Nominativas",
        need: { obj: "invitation", action: "read" },
    },
    {
        name: "invitations",
        href: "/mi-espacio/admin/invitaciones",
        label: "Invitaciones",
        need: { obj: "invitation", action: "read" },
    },
    {
        name: "orders",
        href: "/mi-espacio/admin/pedidos",
        label: "Pedidos",
        need: { obj: "order", action: "read" },
    },
    {
        name: "adminIssues",
        href: "/mi-espacio/admin/incidencias",
        label: "Incidencias (Admin)",
        need: { obj: "issue", action: "read" },
    },
    {
        name: "seo",
        href: "/mi-espacio/admin/seo",
        label: "SEO",
        need: { obj: "seo_metadata", action: "read" },
    },

    // Proyectos
    {
        name: "projects",
        href: "/mi-espacio/proyectos",
        label: "Proyectos",
        need: { obj: "project", action: "read" },
    },
    {
        name: "activities",
        href: "/mi-espacio/actividades",
        label: "Actividades",
        need: { obj: "activity", action: "read" },
    },

    // Merch
    {
        name: "merch",
        href: "/mi-espacio/merch",
        label: "Productos",
        need: null,
    },
    {
        name: "merchFamilies",
        href: "/mi-espacio/merch/drops",
        label: "Drops",
        need: { obj: "family_product", action: "read" },
    },
    {
        name: "cart",
        href: "/mi-espacio/cesta",
        label: "Cesta",
        need: null,
    },
    {
        name: "myOrders",
        href: "/mi-espacio/mis-pedidos",
        label: "Mis Pedidos",
        need: null,
    },
    {
        name: "issues",
        href: "/mi-espacio/incidencias",
        label: "Incidencias",
        need: null,
    },
];

export default LINKS_MAP;
