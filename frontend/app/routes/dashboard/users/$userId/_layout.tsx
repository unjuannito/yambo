import { useEffect, useState } from "react";
import { Outlet, NavLink, useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { RequirePermission } from "~/components/common/RequirePermission";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { getErrorMessage } from "~/types/error";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faAddressCard, faShieldHalved, faBriefcase, faClock } from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";

const TABS = [
    { key: "perfil", label: "Perfil", icon: faAddressCard, href: "perfil" },
    { key: "permisos", label: "Permisos", icon: faShieldHalved, href: "permisos" },
    { key: "proyectos", label: "Proyectos", icon: faBriefcase, href: "proyectos" },
    { key: "historial", label: "Historial", icon: faClock, href: "historial" },
] as const;

export default function UserLayout() {
    const { t } = useTranslation();
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        // Load user from the full list (no dedicated get-user endpoint exists)
        adminUserService.listUsers({ page: 0, size: 1, query: "" })
            .then(async () => {
                // Reload with just this user's context — we use list with a large size
                // and filter client-side, since there's no GET /admin/users/{id}
                const all = await adminUserService.listUsers({ page: 0, size: 500 });
                const found = all.content.find(u => u.id === userId);
                if (found) {
                    setUser(found);
                } else {
                    setError("Usuario no encontrado");
                }
            })
            .catch(err => setError(getErrorMessage(err, "Error al cargar usuario")))
            .finally(() => setLoading(false));
    }, [userId]);

    const refreshUser = async () => {
        if (!userId) return;
        try {
            const all = await adminUserService.listUsers({ page: 0, size: 500 });
            const found = all.content.find(u => u.id === userId);
            if (found) setUser(found);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al recargar usuario"));
        }
    };

    if (loading) {
        return (
            <main className="flex flex-col p-4 md:p-6 w-full">
                <LoadingSpinner size="md" message="Cargando usuario..." />
            </main>
        );
    }

    if (error || !user) {
        return (
            <main className="flex flex-col p-4 md:p-6 w-full">
                <ErrorMessage message={error || "Usuario no encontrado"} onRetry={() => navigate("/mi-espacio/admin/usuarios")} />
            </main>
        );
    }

    return (
        <RequirePermission permission={{ obj: "user", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-4 md:p-6 w-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => navigate("/mi-espacio/admin/usuarios")}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                    </button>
                    <div>
                        <span className="text-xs text-gray-400 font-medium">Usuario</span>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-extrabold font-display text-yambo-black">{user.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.enabled ? "bg-yambo-green-50 text-yambo-green-700" : "bg-coral/10 text-coral"}`}>
                                {user.enabled ? "Activo" : "Inactivo"}
                            </span>
                            {user.system && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Sistema
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                </div>

                {/* User avatar + quick info row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 mt-4 p-4 bg-white rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-14 h-14 rounded-full bg-yambo-green-100 flex items-center justify-center text-xl font-bold text-yambo-green-700 shrink-0 overflow-hidden">
                            {user.photo
                                ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                : user.name.charAt(0).toUpperCase()
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">
                                Creado el {new Date(user.createdAt).toLocaleDateString()}
                                {user.created_by && ` por ${user.created_by}`}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {user.profiles.map(p => (
                                    <span key={p.id} className="px-2 py-0.5 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs font-medium">
                                        {p.name}
                                    </span>
                                ))}
                                {user.groupRoles && user.groupRoles.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                        {user.groupRoles.length} rol{user.groupRoles.length !== 1 ? "es" : ""} en proyectos
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                        <ButtonComponent variant="primary" size="sm" onClick={refreshUser} className="w-full sm:w-auto shrink-0">
                            Recargar
                        </ButtonComponent>
                    </RequirePermission>
                </div>

                {/* Tabs — horizontal scroll on mobile */}
                <div className="mb-6 bg-gray-100/80 rounded-xl p-1 overflow-x-auto">
                    <div className="flex gap-1 w-max">
                        {TABS.map(tab => (
                            <NavLink
                                key={tab.key}
                                to={tab.href}
                                end
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                                        isActive
                                            ? "bg-white text-yambo-green-700 shadow-sm"
                                            : "text-gray-500 hover:text-yambo-green-600 hover:bg-white/50"
                                    }`
                                }
                            >
                                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                                {tab.label}
                            </NavLink>
                        ))}
                    </div>
                </div>

                {/* Pass user + refresh callback to children via Outlet context */}
                <Outlet context={{ user, refreshUser, userId }} />
            </main>
        </RequirePermission>
    );
}
