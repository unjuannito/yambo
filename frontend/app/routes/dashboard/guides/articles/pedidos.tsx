import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faLightbulb } from "@fortawesome/free-solid-svg-icons";

interface Callout {
    n: number;
    desc: string;
    xPct: number;
    yPct: number;
}

function AnnotatedFigure({ src, alt, width, height, callouts, maxWidth, frame = "browser" }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    callouts: Callout[];
    maxWidth?: number;
    frame?: "browser" | "phone";
}) {
    const isPhone = frame === "phone";
    return (
        <figure className={`my-5 flex flex-col ${isPhone ? "sm:flex-row sm:items-start" : "lg:flex-row lg:items-start"} gap-6`}>
            <div
                className={`relative overflow-hidden ${
                    isPhone
                        ? "mx-auto sm:mx-0 sm:shrink-0 rounded-[2.25rem] ring-[6px] ring-gray-900/90 shadow-xl"
                        : "w-full lg:w-[62%] lg:shrink-0 rounded-2xl border border-gray-200 shadow-sm"
                }`}
                style={maxWidth ? { maxWidth } : undefined}
            >
                {isPhone && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 z-10 h-5 w-24 rounded-b-2xl bg-gray-900/90" />
                )}
                <img src={src} alt={alt} width={width} height={height} className="w-full h-auto !m-0" />
                {callouts.map((c) => (
                    <span
                        key={c.n}
                        className="absolute w-6 h-6 rounded-full bg-yambo-green-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-md"
                        style={{ left: `${c.xPct}%`, top: `${c.yPct}%`, transform: "translate(-50%, -50%)" }}
                        aria-hidden="true"
                    >
                        {c.n}
                    </span>
                ))}
            </div>
            <figcaption className={isPhone ? "sm:flex-1" : "lg:flex-1"}>
                <ol className={`mt-3 space-y-1.5 ${isPhone ? "sm:mt-0" : "lg:mt-0"}`}>
                    {callouts.map((c) => (
                        <li key={c.n} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-yambo-green-600 text-white text-xs font-bold flex items-center justify-center">{c.n}</span>
                            <span>{c.desc}</span>
                        </li>
                    ))}
                </ol>
            </figcaption>
        </figure>
    );
}

const DETAILS_DESKTOP_CALLOUTS: Callout[] = [
    { n: 1, desc: "Título e ID del pedido", xPct: 27, yPct: 23 },
    { n: 2, desc: "Cliente del pedido", xPct: 35, yPct: 34 },
    { n: 3, desc: "Estado (cambiable con permisos)", xPct: 65, yPct: 34 },
    { n: 4, desc: "Productos y su configuración", xPct: 24, yPct: 52 },
    { n: 5, desc: "Total del pedido", xPct: 28, yPct: 76 },
    { n: 6, desc: "Historial: ver todos los cambios", xPct: 51, yPct: 76 },
    { n: 7, desc: "Editar el pedido", xPct: 58, yPct: 76 },
    { n: 8, desc: "Cancelar el pedido", xPct: 68, yPct: 76 },
];

const DETAILS_MOBILE_CALLOUTS: Callout[] = [
    { n: 1, desc: "Título e ID del pedido", xPct: 28, yPct: 24 },
    { n: 2, desc: "Productos del pedido", xPct: 16, yPct: 59 },
    { n: 3, desc: "Crear nueva incidencia", xPct: 50, yPct: 62 },
    { n: 4, desc: "Total del pedido", xPct: 18, yPct: 91 },
    { n: 5, desc: "Editar pedido (acción principal)", xPct: 43, yPct: 96 },
];

const EDITOR_CALLOUTS: Callout[] = [
    { n: 1, desc: "Título: editar (o nuevo) pedido", xPct: 26, yPct: 11 },
    { n: 2, desc: "Tipo de incidencia: nueva o vincular a una existente", xPct: 50, yPct: 19 },
    { n: 3, desc: "Nueva incidencia (se crea al guardar)", xPct: 35, yPct: 23 },
    { n: 4, desc: "Vincular a una incidencia existente", xPct: 65, yPct: 23 },
    { n: 5, desc: "Justificación (obligatoria): se registra como incidencia", xPct: 50, yPct: 28 },
    { n: 6, desc: "Productos: cantidad, talla y configuración", xPct: 23, yPct: 45 },
    { n: 7, desc: "Precio unitario (con cambio si se modifica)", xPct: 27, yPct: 80 },
    { n: 8, desc: "Total actualizado", xPct: 75, yPct: 80 },
    { n: 9, desc: "Guardar cambios", xPct: 73, yPct: 88 },
];

export function GuidePedidos() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faClipboardList} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Gestión de pedidos (administradores)</h2>
                    <p className="text-sm text-gray-400">Cómo crear, editar y trazar pedidos de socios, con justificación obligatoria e incidencia vinculada</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-8">
                <div>
                    <p>Desde <strong>Administración → Pedidos</strong> puedes <strong>crear</strong>, <strong>modificar</strong> y <strong>cancelar</strong> pedidos de cualquier socio. Cada vez que creas o editas un pedido, la <strong>justificación es obligatoria</strong>: con ese texto se crea automáticamente una <strong>incidencia vinculada al pedido</strong>, de modo que cada gestión queda documentada y trazable (quién, cuándo y por qué).</p>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">1. Ver el detalle de un pedido</h3>
                    <p className="mt-1">Pulsa <strong>«Ver»</strong> en la fila del pedido para abrir el detalle.</p>
                    <AnnotatedFigure src="/images/wiki/pedido-detalle-desktop.png" alt="Detalle de un pedido en escritorio con sus elementos señalados" width={1440} height={900} callouts={DETAILS_DESKTOP_CALLOUTS} />
                    <p>En el detalle puedes cambiar el <strong>estado</strong>, subir el <strong>justificante</strong>, ver las <strong>incidencias vinculadas</strong> a cada producto y consultar el <strong>total</strong>. Los botones <strong>Historial</strong>, <strong>Editar</strong> y <strong>Cancelar pedido</strong> aparecen según tus permisos y el estado del pedido (un pedido «Cerrado» o «Cancelado» no se puede editar ni cancelar).</p>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">2. En el móvil</h3>
                    <p className="mt-1">El detalle se abre como una <strong>hoja inferior</strong>: puedes cerrarla deslizando hacia abajo el asa superior.</p>
                    <AnnotatedFigure src="/images/wiki/pedido-detalle-mobile.png" alt="Detalle de un pedido en móvil (hoja inferior) con sus elementos señalados" width={390} height={844} callouts={DETAILS_MOBILE_CALLOUTS} maxWidth={300} frame="phone" />
                    <p>La acción principal es <strong>«Editar pedido»</strong>; el resto de acciones (historial, cancelar, cerrar) están en el menú <strong>«⋯»</strong>.</p>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">3. Editar (o crear) un pedido</h3>
                    <p className="mt-1">Al editar puedes elegir si el cambio se registra en una <strong>incidencia nueva</strong> o si lo vinculas a una <strong>incidencia existente</strong>. La <strong>justificación</strong> es siempre obligatoria.</p>
                    <AnnotatedFigure src="/images/wiki/pedido-editor.png" alt="Editor de pedido con la justificación y los productos señalados" width={1440} height={900} callouts={EDITOR_CALLOUTS} />
                    <p>Cambia cantidades o configuración y verás el <strong>precio</strong> y el <strong>total</strong> actualizados al momento. Al guardar, los cambios quedan registrados en el <strong>historial</strong>.</p>
                </div>

                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yambo-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yambo-green-800">Historial de cambios</p>
                            <p className="text-yambo-green-700 mt-1">Cada cambio queda registrado con su <strong>acción</strong> (añadido, modificado, eliminado), <strong>quien</strong> lo hizo, la <strong>incidencia</strong> vinculada y la <strong>fecha</strong>. Si eliminas un producto, la incidencia asociada se cierra automáticamente. Puedes consultarlo en <strong>«Historial»</strong> desde el detalle del pedido.</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
