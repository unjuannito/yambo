import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faClipboardList,
    faBagShopping,
    faComments,
    faUsers,
    faClipboard,
    faGear,
    faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "~/hooks/useAuth";

interface QuickAction {
    label: string;
    href: string;
    icon: typeof faClipboardList;
    className: string;
    permission: { obj: string; action: string } | null;
}

const QUICK_ACTIONS: QuickAction[] = [
    {
        label: "Mis pedidos",
        href: "/mi-espacio/mis-pedidos",
        icon: faClipboardList,
        className: "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 hover:from-yambo-green-600 hover:to-yambo-green-700 text-white shadow-lg shadow-yambo-green-500/25",
        permission: null,
    },
    {
        label: "Explorar tienda",
        href: "/mi-espacio/merch",
        icon: faBagShopping,
        className: "bg-gradient-to-r from-yambo-purple-500 to-yambo-purple-600 hover:from-yambo-purple-600 hover:to-yambo-purple-700 text-white shadow-lg shadow-yambo-purple-500/25",
        permission: null,
    },
    {
        label: "Mis incidencias",
        href: "/mi-espacio/incidencias",
        icon: faComments,
        className: "bg-gradient-to-r from-yambo-coral to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-yambo-coral/25",
        permission: null,
    },
    {
        label: "Gestionar usuarios",
        href: "/mi-espacio/admin/usuarios",
        icon: faUsers,
        className: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25",
        permission: { obj: "user", action: "read" },
    },
    {
        label: "Gestionar pedidos",
        href: "/mi-espacio/admin/pedidos",
        icon: faClipboard,
        className: "bg-gradient-to-r from-yambo-gold to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-yambo-gold/25",
        permission: { obj: "order", action: "read" },
    },
    {
        label: "Configuración",
        href: "/mi-espacio/admin/configuracion",
        icon: faGear,
        className: "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg shadow-gray-500/25",
        permission: { obj: "settings", action: "read" },
    },
    {
        label: "Ver informes",
        href: "/mi-espacio/admin/informes",
        icon: faChartLine,
        className: "bg-gradient-to-r from-yambo-sky to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white shadow-lg shadow-yambo-sky/25",
        permission: { obj: "report", action: "read" },
    },
];

export default function QuickActions() {
    const { hasPermission } = useAuth();

    const visible = QUICK_ACTIONS.filter(
        (a) => !a.permission || hasPermission(a.permission)
    );

    return (
        <section>
            <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                Accesos rápidos
            </h2>
            <div className="flex flex-wrap gap-3">
                {visible.map((action) => (
                    <Link
                        key={action.href}
                        to={action.href}
                        className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 ${action.className}`}
                    >
                        <FontAwesomeIcon icon={action.icon} className="w-4 h-4" />
                        {action.label}
                    </Link>
                ))}
            </div>
        </section>
    );
}
