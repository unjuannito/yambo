import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faLightbulb } from "@fortawesome/free-solid-svg-icons";

export function GuidePaginaPrincipal() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faPenToSquare} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Editar la Página Principal</h2>
                    <p className="text-sm text-gray-400">El contenido que ven los visitantes en la portada de la web</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <div>
                    <h3 className="font-bold text-yambo-black text-base">Pasos</h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → Página Principal</strong></li>
                        <li>Edita los textos, imágenes o secciones visibles</li>
                        <li>Pulsa <strong>«Guardar»</strong></li>
                        <li>Abre <strong>yambo.cabrasky.net</strong> para comprobar el resultado</li>
                    </ol>
                </div>

                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yambo-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yambo-green-800">Consejo</p>
                            <p className="text-yambo-green-700 mt-1">Los cambios en la portada son visibles inmediatamente para todo el mundo (no hace falta esperar). Revisa siempre en móvil y en ordenador.</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
