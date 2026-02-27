import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faClipboardList,
    faComments,
    faBagShopping,
    faUsers,
    faClipboard,
    faFolder,
    faCalendarDays,
    faCubes,
} from "@fortawesome/free-solid-svg-icons";

export interface SummaryCardConfig {
    key: string;
    label: string;
    icon: IconDefinition;
    href: string;
    colorClass: string;
    iconBgClass: string;
    permission: { obj: string; action: string } | null;
}

export const PERSONAL_CARDS: SummaryCardConfig[] = [
    {
        key: "myOrders",
        label: "Mis Pedidos",
        icon: faClipboardList,
        href: "/mi-espacio/mis-pedidos",
        colorClass: "bg-blue-50 border-blue-200",
        iconBgClass: "bg-blue-100 text-blue-600",
        permission: null,
    },
    {
        key: "issues",
        label: "Mis Incidencias",
        icon: faComments,
        href: "/mi-espacio/incidencias",
        colorClass: "bg-red-50 border-red-200",
        iconBgClass: "bg-red-100 text-red-600",
        permission: null,
    },
    {
        key: "merch",
        label: "Tienda",
        icon: faBagShopping,
        href: "/mi-espacio/merch",
        colorClass: "bg-purple-50 border-purple-200",
        iconBgClass: "bg-purple-100 text-purple-600",
        permission: null,
    },
];

export const ADMIN_CARDS: SummaryCardConfig[] = [
    {
        key: "totalUsers",
        label: "Usuarios",
        icon: faUsers,
        href: "/mi-espacio/admin/usuarios",
        colorClass: "bg-blue-50 border-blue-200",
        iconBgClass: "bg-blue-100 text-blue-600",
        permission: { obj: "user", action: "read" },
    },
    {
        key: "totalOrders",
        label: "Pedidos",
        icon: faClipboard,
        href: "/mi-espacio/admin/pedidos",
        colorClass: "bg-green-50 border-green-200",
        iconBgClass: "bg-green-100 text-green-600",
        permission: { obj: "order", action: "read" },
    },
    {
        key: "totalProjects",
        label: "Proyectos",
        icon: faFolder,
        href: "/mi-espacio/proyectos",
        colorClass: "bg-violet-50 border-violet-200",
        iconBgClass: "bg-violet-100 text-violet-600",
        permission: { obj: "project", action: "read" },
    },
    {
        key: "activities",
        label: "Actividades",
        icon: faCalendarDays,
        href: "/mi-espacio/actividades",
        colorClass: "bg-amber-50 border-amber-200",
        iconBgClass: "bg-amber-100 text-amber-600",
        permission: { obj: "activity", action: "read" },
    },
    {
        key: "totalProducts",
        label: "Productos",
        icon: faCubes,
        href: "/mi-espacio/merch/drops",
        colorClass: "bg-orange-50 border-orange-200",
        iconBgClass: "bg-orange-100 text-orange-600",
        permission: { obj: "family_product", action: "read" },
    },
];