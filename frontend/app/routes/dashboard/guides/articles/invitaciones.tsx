import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopesBulk, faLink, faUserPlus, faClipboardCheck, faLightbulb } from "@fortawesome/free-solid-svg-icons";

export function GuideInvitaciones() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faEnvelopesBulk} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Invitaciones: cómo dar de alta a nuevos socios</h2>
                    <p className="text-sm text-gray-400">Hay tres formas de invitar, según cómo quieras que se registre la persona</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <div>
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-yambo-green-500" />
                        1. Enlace por perfiles (invitación general)
                    </h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → Invitaciones</strong> y pulsa <strong>«Nueva Invitación»</strong></li>
                        <li>Elige <strong>«Por perfil»</strong> y selecciona el/los perfiles que recibirá la persona al registrarse</li>
                        <li>Opcional: fija una fecha de inicio y fin de validez</li>
                        <li>Pulsa <strong>«Crear»</strong> y copia el enlace generado</li>
                        <li>Compártelo con la persona (email, WhatsApp, …)</li>
                    </ol>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4 text-yambo-green-500" />
                        2. Nominativa (para una persona concreta)
                    </h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>En <strong>Invitaciones</strong>, pulsa <strong>«Nueva Invitación»</strong> y elige <strong>«Nominativa»</strong></li>
                        <li>Introduce el <strong>email</strong> de la persona</li>
                        <li>Elige los perfiles y (opcional) la fecha de caducidad</li>
                        <li>Pulsa <strong>«Crear»</strong> — se enviará/registrará la invitación para ese email</li>
                    </ol>
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm">
                        <p className="font-medium text-yambo-black">¿Diferencia con el enlace general?</p>
                        <p className="mt-1">Con el enlace general, cualquiera que tenga el enlace puede registrarse. Con la nominativa, solo la persona con ese email puede usarla.</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faClipboardCheck} className="w-4 h-4 text-yambo-green-500" />
                        3. Por proyecto y rol
                    </h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>En la sección de <strong>Proyectos → Padres</strong> de un proyecto, pulsa <strong>«Enlaces anteriores»</strong> o crea un enlace nuevo de proyecto+rol</li>
                        <li>Selecciona el <strong>proyecto</strong> y el <strong>rol</strong> (monitor, coordinador, padre…)</li>
                        <li>La persona se registrará con ese rol asignado directamente</li>
                    </ol>
                </div>

                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yambo-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yambo-green-800">Seguimiento</p>
                            <p className="text-yambo-green-700 mt-1">En la lista de invitaciones puedes ver el estado de cada enlace (activo, agotado, caducado) y cuántas veces se ha usado. Pulsa el icono de copiar para reutilizar un enlace activo.</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
