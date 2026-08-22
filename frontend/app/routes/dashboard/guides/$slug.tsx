import { useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router";
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
    const location = useLocation();

    // Scroll a la sección indicada por #hash (p.ej. /guias/flujos-de-trabajo#pedidos).
    // El dashboard scrollea en <main> (overflow-y-auto), no en window, así que el
    // navegador no resuelve el ancla solo: hay que hacer scroll manual al elemento.
    useEffect(() => {
        if (!location.hash) return;
        const id = location.hash.slice(1);
        // Esperar al render del contenido (el componente de la guía se monta en el
        // mismo commit, pero el layout del dashboard puede necesitar un frame).
        const timer = window.setTimeout(() => {
            const el = document.getElementById(id);
            if (!el) return;
            const container = document.querySelector("main");
            if (container) {
                // header sticky h-16 (4rem) del dashboard
                const top = el.getBoundingClientRect().top + container.scrollTop - 64;
                container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
            } else {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 80);
        return () => window.clearTimeout(timer);
    }, [location.hash, slug]);

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
