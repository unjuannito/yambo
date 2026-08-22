import { useParams, Link, useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faBook } from "@fortawesome/free-solid-svg-icons";
import { GUIDES, GUIDE_COMPONENTS } from "./guides-content";
import type { Route } from "./+types/$slug";

export function meta({ params }: Route.MetaArgs) {
    const guide = GUIDES.find((g) => g.id === params.slug);
    return [
        { title: guide ? `Yambo - ${guide.title}` : "Yambo - Guías y Wiki" },
        { name: "description", content: guide?.description ?? "Guías paso a paso para configurar y mantener la web de Yambo" },
    ];
}

export default function GuideDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();

    if (!slug || !GUIDE_COMPONENTS[slug]) {
        // Slug desconocido → volver a la primera guía
        navigate("/mi-espacio/admin/guias/configuracion", { replace: true });
        return null;
    }

    const GuideComponent = GUIDE_COMPONENTS[slug];
    const idx = GUIDES.findIndex((g) => g.id === slug);
    const prev = idx > 0 ? GUIDES[idx - 1] : null;
    const next = idx < GUIDES.length - 1 ? GUIDES[idx + 1] : null;

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Cabecera */}
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black flex items-center gap-3">
                    <FontAwesomeIcon icon={faBook} className="text-yambo-green-500" />
                    Guías y Wiki
                </h1>
                <p className="text-gray-400 mt-2">
                    Instrucciones paso a paso para configurar y mantener la web de Yambo.
                    Pensadas para que cualquier persona pueda seguirlas, sin necesidad de saber programar.
                </p>
            </div>

            {/* Artículo */}
            <GuideComponent />

            {/* Navegación anterior/siguiente */}
            <div className="flex items-center justify-between gap-4 mt-8 pb-4">
                {prev ? (
                    <Link
                        to={`/mi-espacio/admin/guias/${prev.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-yambo-green-300 hover:text-yambo-green-700 transition-all"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                        <span className="hidden sm:inline">{prev.title}</span>
                        <span className="sm:hidden">Anterior</span>
                    </Link>
                ) : <span />}
                {next ? (
                    <Link
                        to={`/mi-espacio/admin/guias/${next.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-yambo-green-300 hover:text-yambo-green-700 transition-all"
                    >
                        <span className="hidden sm:inline">{next.title}</span>
                        <span className="sm:hidden">Siguiente</span>
                        <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                    </Link>
                ) : <span />}
            </div>
        </div>
    );
}
