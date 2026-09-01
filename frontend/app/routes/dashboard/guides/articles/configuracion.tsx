import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export function GuideConfiguracion() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faGear} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Configuración general</h2>
                    <p className="text-sm text-gray-400">Ajustes de la web accesibles desde «Configuración» en el menú de administración</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <div>
                    <h3 className="font-bold text-yambo-black text-base">¿Qué se puede configurar?</h3>
                    <ul className="mt-1 space-y-1 list-disc pl-5">
                        <li><strong>OAuth / Inicio de sesión:</strong> activar «Iniciar sesión con Google» y pegar las credenciales. Ver la guía <a href="/mi-espacio/admin/guias/oauth-google" className="text-yambo-green-600 hover:underline">Google — Inicio de sesión</a>.</li>
                        <li><strong>Datos generales:</strong> nombre de la asociación, correo de contacto y otros datos visibles.</li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">Cómo guardar los cambios</h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → Configuración</strong></li>
                        <li>Modifica los campos que necesites</li>
                        <li>Pulsa <strong>«Guardar»</strong></li>
                        <li>Verifica que el cambio se ve en la web (puede requerir recargar la página)</li>
                    </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yellow-800">Credenciales OAuth</p>
                            <p className="text-yellow-700 mt-1">El Client Secret nunca se muestra en pantalla (aparece oculto). Si necesitas cambiarlo, genera uno nuevo en Google Cloud Console y pégalo aquí.</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
