import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { NavLink } from "react-router";
import type { User } from "~/types/userType";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faBagShopping, faComments, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

type OutletContext = {
    user: User;
    refreshUser: () => Promise<void>;
    userId: string | undefined;
};

export default function UserHistorial() {
    const { t } = useTranslation();
    const { user } = useOutletContext<OutletContext>();

    return (
        <div className="max-w-2xl space-y-6">
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

            {/* Enlaces rápidos */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black">Enlaces rápidos</h2>
                </div>
                <div className="divide-y divide-gray-50">
                    <NavLink
                        to="/mi-espacio/mis-pedidos"
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
                        to="/mi-espacio/incidencias"
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
