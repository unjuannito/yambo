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
        name: "invitations",
        href: "/mi-espacio/admin/invitaciones",
        label: "Invitaciones",
        need: { obj: "invitation", action: "read" },
    },
    {
        name: "promotionInvitations",
        href: "/mi-espacio/admin/promociones",
        label: "Promociones",
        need: { obj: "invitation", action: "read" },
    },
    {
        name: "orders",
        href: "/mi-espacio/admin/pedidos",
        label: "Pedidos",
        need: { obj: "order", action: "read" },
    },

    // Proyectos
    {
        name: "projects",
        href: "/mi-espacio/proyectos",
        label: "Proyectos",
        need: { obj: "project", action: "read" },
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
];

export default LINKS_MAP;
