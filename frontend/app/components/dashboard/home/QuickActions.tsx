import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faClipboardList,
    faBagShopping,
    faComments,
    faUsers,
    faClipboard,
    faGear,
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
        className: "bg-blue-600 hover:bg-blue-700 text-white",
        permission: null,
    },
    {
        label: "Explorar tienda",
        href: "/mi-espacio/merch",
        icon: faBagShopping,
        className: "bg-purple-600 hover:bg-purple-700 text-white",
        permission: null,
    },
    {
        label: "Mis incidencias",
        href: "/mi-espacio/incidencias",
        icon: faComments,
        className: "bg-red-600 hover:bg-red-700 text-white",
        permission: null,
    },
    {
        label: "Gestionar usuarios",
        href: "/mi-espacio/admin/usuarios",
        icon: faUsers,
        className: "bg-emerald-600 hover:bg-emerald-700 text-white",
        permission: { obj: "user", action: "read" },
    },
    {
        label: "Gestionar pedidos",
        href: "/mi-espacio/admin/pedidos",
        icon: faClipboard,
        className: "bg-amber-600 hover:bg-amber-700 text-white",
        permission: { obj: "order", action: "read" },
    },
    {
        label: "Configuración",
        href: "/mi-espacio/admin/configuracion",
        icon: faGear,
        className: "bg-gray-600 hover:bg-gray-700 text-white",
        permission: { obj: "settings", action: "read" },
    },
];

export default function QuickActions() {
    const { hasPermission } = useAuth();

    const visible = QUICK_ACTIONS.filter(
        (a) => !a.permission || hasPermission(a.permission)
    );

    return (
        <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Accesos rápidos
            </h2>
            <div className="flex flex-wrap gap-3">
                {visible.map((action) => (
                    <Link
                        key={action.href}
                        to={action.href}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${action.className}`}
                    >
                        <FontAwesomeIcon icon={action.icon} className="w-4 h-4" />
                        {action.label}
                    </Link>
                ))}
            </div>
        </section>
    );
}
