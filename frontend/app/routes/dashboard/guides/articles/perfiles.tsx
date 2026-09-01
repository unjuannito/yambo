import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export function GuidePerfiles() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Perfiles y permisos</h2>
                    <p className="text-sm text-gray-400">Los perfiles agrupan permisos y determinan qué puede hacer cada persona en la web</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <div>
                    <h3 className="font-bold text-yambo-black text-base">¿Qué es un perfil?</h3>
                    <p className="mt-1">Un perfil es un conjunto de permisos (ver usuarios, editar productos, gestionar incidencias…). A cada usuario se le asigna uno o varios perfiles.</p>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">Gestionar perfiles</h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → Perfiles</strong></li>
                        <li>Verás la lista de perfiles existentes y sus permisos</li>
                        <li>Pulsa <strong>«Nuevo perfil»</strong> para crear uno, o edita uno existente</li>
                        <li>Marca los <strong>permisos</strong> que quieras que incluya</li>
                        <li>Pulsa <strong>«Guardar»</strong></li>
                    </ol>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">Asignar un perfil a un usuario</h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → Usuarios</strong></li>
                        <li>Abre el usuario que quieras modificar</li>
                        <li>En la sección de <strong>perfiles</strong>, añade o quita perfiles</li>
                        <li>Guarda los cambios</li>
                    </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yellow-800">Cuidado con los permisos</p>
                            <p className="text-yellow-700 mt-1">Un perfil con muchos permisos da acceso a muchas funciones. Revisa siempre qué permisos incluye antes de asignarlo, y no asignes el perfil de administrador a quien no lo necesite.</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
