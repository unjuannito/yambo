import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { NavLink } from "react-router";
import { Link } from "react-router";
import type { User } from "~/types/userType";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faClock,
    faBagShopping,
    faComments,
    faArrowUpRightFromSquare,
    faShieldHalved,
    faUserShield,
    faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import { adminUserService, type AccessGrant } from "~/services/adminUserService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";

type OutletContext = {
    user: User;
    refreshUser: () => Promise<void>;
    userId: string | undefined;
};

export default function UserHistorial() {
    const { t } = useTranslation();
    const { user, userId } = useOutletContext<OutletContext>();
    const [grants, setGrants] = useState<AccessGrant[] | null>(null);
    const [grantsError, setGrantsError] = useState(false);

    const loadGrants = useCallback(async () => {
        if (!userId) return;
        try {
            setGrantsError(false);
            setGrants(await adminUserService.getUserGrants(userId));
        } catch {
            setGrantsError(true);
            setGrants([]);
        }
    }, [userId]);

    useEffect(() => {
        void loadGrants();
    }, [loadGrants]);

    const originLabel = (grant: AccessGrant): string => {
        if (grant.source === "MANUAL") {
            return grant.grantedByName
                ? `Asignado por ${grant.grantedByName}`
                : "Asignado manualmente";
        }
        const typeLabel =
            grant.invitationType === "NOMINATIVE"
                ? "invitación nominativa"
                : grant.invitationType === "PROJECT_ROLE"
                  ? "link de rol"
                  : "link de invitación";
        return `Vía ${typeLabel}`;
    };

    const grantLabel = (grant: AccessGrant): string => {
        if (grant.grantType === "PROFILE") {
            return grant.profileName || grant.profileId || "Perfil";
        }
        const roleLabel =
            grant.role === "COORDINATOR"
                ? "Coordinador"
                : grant.role === "MONITOR"
                  ? "Monitor"
                  : grant.role === "PARENT"
                    ? "Padre/Madre"
                    : grant.role || "Rol";
        return grant.projectName ? `${roleLabel} · ${grant.projectName}` : roleLabel;
    };

    const grantIcon = (grant: AccessGrant) =>
        grant.grantType === "GROUP_ROLE" ? faUserShield : faShieldHalved;

    const grantTone = (grant: AccessGrant) =>
        grant.revokedAt ? "bg-gray-50" : "bg-white";

    return (
        <div className="max-w-3xl space-y-6">
            {/* Info de la cuenta */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black flex items-center gap-2">
                        <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-yambo-green-600" />
                        Información de la cuenta
                    </h2>
                </div>
                <div className="divide-y divide-gray-50">
                    <div className="px-6 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Usuario desde</span>
                        <span className="text-sm font-medium text-yambo-black">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="px-6 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-600">ID de usuario</span>
                        <span className="text-sm font-mono text-gray-500">{user.id}</span>
                    </div>
                </div>
            </section>

            {/* Origen de roles y perfiles */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserCheck} className="w-4 h-4 text-yambo-green-600" />
                        Origen de roles y perfiles
                    </h2>
                </div>
                {grants === null ? (
                    <div className="py-8 flex justify-center">
                        <LoadingSpinner size="md" />
                    </div>
                ) : grantsError ? (
                    <p className="px-6 py-4 text-sm text-gray-500">
                        No se pudo cargar el historial de accesos.
                    </p>
                ) : grants.length === 0 ? (
                    <p className="px-6 py-4 text-sm text-gray-400">
                        Sin registros de cómo se obtuvieron los accesos.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                                    <th className="px-6 py-3">Acceso</th>
                                    <th className="px-6 py-3">Cómo se obtuvo</th>
                                    <th className="px-6 py-3">Quién</th>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grants.map((grant) => (
                                    <tr key={grant.id} className={`border-b border-gray-50 ${grantTone(grant)}`}>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={grantIcon(grant)} className="w-3.5 h-3.5 text-yambo-green-600" />
                                                <span className="font-medium text-yambo-black">{grantLabel(grant)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">{originLabel(grant)}</td>
                                        <td className="px-6 py-3">
                                            {grant.grantedBy ? (
                                                <Link
                                                    to={`/mi-espacio/admin/usuarios/${grant.grantedBy}/perfil`}
                                                    className="font-medium text-yambo-black hover:text-yambo-green-600 transition-colors"
                                                >
                                                    {grant.grantedByName || grant.grantedBy}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {new Date(grant.grantedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-3">
                                            {grant.revokedAt ? (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                                                    Retirado {new Date(grant.revokedAt).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-yambo-green-50 text-yambo-green-700">
                                                    Vigente
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Enlaces rápidos */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black">Enlaces rápidos</h2>
                </div>
                <div className="divide-y divide-gray-50">
                    <NavLink
                        to={`/mi-espacio/admin/pedidos?customerId=${user.id}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-yambo-green-50 flex items-center justify-center">
                                <FontAwesomeIcon icon={faBagShopping} className="text-sm text-yambo-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-yambo-black">Pedidos</p>
                                <p className="text-xs text-gray-400">Ver pedidos realizados por este usuario</p>
                            </div>
                        </div>
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 text-gray-400" />
                    </NavLink>
                    <NavLink
                        to={`/mi-espacio/admin/incidencias?userId=${user.id}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-yambo-green-50 flex items-center justify-center">
                                <FontAwesomeIcon icon={faComments} className="text-sm text-yambo-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-yambo-black">Incidencias</p>
                                <p className="text-xs text-gray-400">Ver incidencias abiertas por este usuario</p>
                            </div>
                        </div>
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 text-gray-400" />
                    </NavLink>
                </div>
            </section>
        </div>
    );
}
