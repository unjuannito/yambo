import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { AnnotatedFigure, type Callout } from "./shared";

const OVERVIEW_CALLOUTS: Callout[] = [
    { n: 1, desc: "Título de la página", xPct: 32, yPct: 12 },
    { n: 2, desc: "Generar metadatos faltantes", xPct: 91, yPct: 13 },
    { n: 3, desc: "Filtrar páginas", xPct: 21, yPct: 21 },
];

export function GuideSeo() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">SEO: posicionamiento en buscadores</h2>
                    <p className="text-sm text-gray-400">Títulos, descripciones y metadatos de las páginas públicas</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <AnnotatedFigure src="/images/wiki/guia-seo.png" alt="Página de SEO con sus elementos señalados" width={1440} height={900} callouts={OVERVIEW_CALLOUTS} />
                <div>
                    <h3 className="font-bold text-yambo-black text-base">Qué se puede editar</h3>
                    <ul className="mt-1 space-y-1 list-disc pl-5">
                        <li><strong>Título</strong> de la página: lo que aparece en la pestaña del navegador y como enlace en Google.</li>
                        <li><strong>Descripción</strong>: el texto que se muestra bajo el título en los resultados de búsqueda.</li>
                        <li><strong>Imagen</strong> de vista previa: la que se ve al compartir el enlace en WhatsApp o redes sociales.</li>
                    </ul>
                    <p className="mt-2">Cada página pública de la web (inicio, actividades, proyectos, contacto…) tiene sus propios metadatos. Si alguna página no los tiene, pulsa <strong>«Generar faltantes»</strong> para que la web cree automáticamente los metadatos que falten y no dejes ninguna página sin posicionar.</p>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">Cómo editarlo</h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → SEO</strong></li>
                        <li>Selecciona la página que quieras optimizar</li>
                        <li>Escribe un <strong>título</strong> descriptivo (40–60 caracteres recomendado)</li>
                        <li>Escribe una <strong>descripción</strong> clara (120–160 caracteres)</li>
                        <li>Pulsa <strong>«Guardar»</strong></li>
                    </ol>
                </div>

                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yambo-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yambo-green-800">Consejo</p>
                            <p className="text-yambo-green-700 mt-1">Escribe títulos que expliquen claramente qué es la página («Actividades de Yambo — Asociación Juvenil»), no genéricos como «Inicio» o «Página 1».</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
