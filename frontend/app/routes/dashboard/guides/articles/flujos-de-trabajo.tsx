import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardCheck, faShieldHalved, faLink, faCheckCircle, faTriangleExclamation, faCubes, faCalendarDays, faEnvelopesBulk } from "@fortawesome/free-solid-svg-icons";

export function GuideFlujosDeTrabajo() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faClipboardCheck} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Flujos de trabajo</h2>
                    <p className="text-sm text-gray-400">Estados por los que pasa cada elemento y qué transiciones están permitidas</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-8">
                {/* Incidencias */}
                <section id="incidencias" className="border rounded-2xl p-5">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 text-yambo-green-500" />
                        Flujo de trabajo de incidencias
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Abierto</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">En Progreso</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">Cerrado</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-gray-400">Acciones:</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Abierto -&gt; En Progreso</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Abierto -&gt; Cerrado</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">En Progreso -&gt; Abierto</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">En Progreso -&gt; Cerrado</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Cerrado -&gt; Abierto</span>
                    </div>
                    <p className="mt-3 text-sm">Un usuario o el administrador abre una incidencia. Mientras se gestiona pasa a «En Progreso». Al resolverse se cierra. Si se reabre, vuelve a «Abierto».</p>
                </section>

                {/* Pedidos */}
                <section id="pedidos" className="border rounded-2xl p-5">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faLink} className="w-4 h-4 text-yambo-green-500" />
                        Flujo de trabajo de pedidos
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente de Pago</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Confirmando Pago</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Pago Confirmado</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Pendiente de Productos</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Cerrado</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-gray-400">Acciones:</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Pendiente de Pago -&gt; Confirmando Pago</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Pendiente de Pago -&gt; Cancelado</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Confirmando Pago -&gt; Pago Confirmado</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Confirmando Pago -&gt; Cancelado</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Pago Confirmado -&gt; Pendiente de Productos</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Pendiente de Productos -&gt; Cerrado</span>
                    </div>
                    <p className="mt-3 text-sm">«Cancelado» es un estado final al que se puede llegar desde «Pendiente de Pago» o «Confirmando Pago». Una vez cerrado o cancelado, no se puede cambiar.</p>

                    <h4 className="mt-5 font-bold text-yambo-black text-sm">Gestión de pedidos por administradores</h4>
                    <p className="mt-2 text-sm">
                        Los administradores (perfil Administrador o Gestor de Merch) pueden crear, modificar y cancelar pedidos de cualquier socio desde la página <strong>Pedidos</strong>:
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-yambo-green-500 mt-0.5 shrink-0" />
                            <span><strong>Crear un pedido:</strong> botón «Nuevo pedido» → busca al socio por nombre o email → añade productos (colección → producto → cantidad) y guarda. El pedido queda «Pendiente de Pago» y el socio recibe el email.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-yambo-green-500 mt-0.5 shrink-0" />
                            <span><strong>Modificar un pedido:</strong> botón «Editar» en el detalle del pedido → cambia productos, cantidades o configuración. No se puede editar un pedido «Cerrado» o «Cancelado».</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-yambo-green-500 mt-0.5 shrink-0" />
                            <span><strong>Cancelar un pedido:</strong> botón «Cancelar pedido» en el detalle → pasa el pedido a estado «Cancelado» (pide confirmación). Solo se puede cancelar un pedido «Pendiente de Pago» o «Confirmando Pago».</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-yambo-green-500 mt-0.5 shrink-0" />
                            <span><strong>Subir justificante:</strong> el socio sube su justificante desde «Mis pedidos»; el administrador también puede subirlo o reemplazarlo desde el detalle del pedido.</span>
                        </li>
                    </ul>
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
                            Justificación obligatoria (incidencia o petición)
                        </p>
                        <p className="mt-1.5 text-sm text-amber-800">
                            Al <strong>crear</strong> o <strong>modificar</strong> un pedido de un socio, el campo «Justificación» es <strong>obligatorio</strong>.
                            Con ese texto se crea automáticamente una <strong>incidencia vinculada al pedido</strong> (en el módulo de Incidencias), de modo que
                            cada gestión administrativa queda documentada y trazable: quién la hizo, cuándo y por qué.
                        </p>
                        <p className="mt-1.5 text-sm text-amber-700">
                            Ejemplo: «Pedido solicitado por WhatsApp», «Cambio de talla tras error en el pedido original».
                        </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        Estos botones solo aparecen si tienes permisos de administración sobre pedidos.
                    </p>
                    <p className="mt-2 text-sm">
                        <a href="/mi-espacio/admin/guias/pedidos" className="text-yambo-green-600 hover:underline font-medium">Ver la guía completa de pedidos con capturas paso a paso →</a>
                    </p>
                </section>

                {/* Colecciones (drops) */}
                <section id="colecciones" className="border rounded-2xl p-5">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faCubes} className="w-4 h-4 text-yambo-green-500" />
                        Flujo de trabajo de colecciones
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Abierto</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Pedidos Cerrados</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">En Fabricación</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Por Entregar</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Entregado</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-gray-400">Acciones:</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Abierto -&gt; Pedidos Cerrados</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Pedidos Cerrados -&gt; En Fabricación</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">En Fabricación -&gt; Por Entregar</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Por Entregar -&gt; Entregado</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Cualquiera -&gt; Cancelado (devolver dinero)</span>
                    </div>
                    <p className="mt-3 text-sm">«Cancelado» se puede hacer desde cualquier estado antes de «Entregado» (implica devolver el dinero). Entregado y Cancelado son estados finales.</p>
                </section>

                {/* Invitaciones */}
                <section id="invitaciones" className="border rounded-2xl p-5">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faEnvelopesBulk} className="w-4 h-4 text-yambo-green-500" />
                        Flujo de trabajo de invitaciones
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Activa</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Agotada</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-gray-400">Estados:</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Activa</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Agotada (usos máximos alcanzados)</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Expirada (fecha fin pasada)</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Deshabilitada (manual)</span>
                    </div>
                    <p className="mt-3 text-sm">Una invitación nace «Activa». Se agota cuando alcanza su límite de usos, expira al pasar su fecha de fin, o la deshabilita un administrador. Los estados finales no se pueden revertir.</p>
                </section>

                {/* Actividades */}
                <section id="actividades" className="border rounded-2xl p-5">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarDays} className="w-4 h-4 text-yambo-green-500" />
                        Flujo de trabajo de actividades
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Planificada</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Abierta para apuntarse</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Inscripciones cerradas</span>
                        <span className="text-yambo-green-400">→</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Cerrada</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-gray-400">Acciones:</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Planificada -&gt; Abierta</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Abierta -&gt; Inscripciones cerradas</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Inscripciones cerradas -&gt; Cerrada</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Cualquiera -&gt; Cancelada</span>
                    </div>
                    <p className="mt-3 text-sm">Una actividad se planifica, se abre para apuntarse, se cierran las inscripciones y finalmente se cierra. Desde cualquier estado se puede cancelar.</p>
                </section>
            </div>
        </article>
    );
}
