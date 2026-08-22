import { useEffect, useState, useCallback } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faArrowUp, faListUl, faXmark } from "@fortawesome/free-solid-svg-icons";
import { GUIDES } from "./guides-content";

function getScrollContainer(): HTMLElement | null {
    // El dashboard layout scrollea en <main> (overflow-y-auto); fallback a window
    return document.querySelector("main");
}

export default function GuidesLayout() {
    const location = useLocation();
    const [showTop, setShowTop] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Cerrar el menú móvil al navegar
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // Detectar scroll para mostrar el botón "volver arriba"
    useEffect(() => {
        const container = getScrollContainer() ?? window;
        const onScroll = () => {
            const y = container === window
                ? window.scrollY
                : (container as HTMLElement).scrollTop;
            setShowTop(y > 300);
        };
        container.addEventListener("scroll", onScroll, { passive: true });
        return () => container.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToTop = useCallback(() => {
        const container = getScrollContainer() ?? window;
        container.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    return (
        <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto">
            {/* ── Sidebar de artículos (desktop) ── */}
            <aside className="hidden md:block w-60 flex-shrink-0 sticky top-0 self-start max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
                <div className="flex items-center gap-2 px-2 mb-3">
                    <FontAwesomeIcon icon={faBook} className="w-4 h-4 text-yambo-green-500" />
                    <span className="text-xs font-bold text-yambo-green-600 uppercase tracking-wider">
                        Artículos
                    </span>
                </div>
                <nav className="space-y-1">
                    {GUIDES.map((g) => (
                        <NavLink
                            key={g.id}
                            to={`/mi-espacio/admin/guias/${g.id}`}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                                    isActive
                                        ? "bg-yambo-green-50 text-yambo-green-700 font-semibold border-l-3 border-yambo-green-500 shadow-sm"
                                        : "text-gray-600 hover:bg-yambo-green-50/50 hover:text-yambo-green-700"
                                }`
                            }
                        >
                            <FontAwesomeIcon icon={g.icon} className="w-4 h-4 flex-shrink-0" />
                            <span className="leading-tight">{g.title}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* ── Contenido ── */}
            <div className="flex-1 min-w-0 p-4 md:p-6">
                {/* Selector móvil */}
                <div className="md:hidden mb-4">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-2xl border border-gray-200 shadow-sm text-sm font-medium text-gray-700"
                    >
                        <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faListUl} className="w-4 h-4 text-yambo-green-600" />
                            Índice de artículos
                        </span>
                        <FontAwesomeIcon
                            icon={menuOpen ? faXmark : faListUl}
                            className="w-4 h-4 text-gray-400"
                        />
                    </button>
                    {menuOpen && (
                        <nav className="mt-2 bg-white rounded-2xl border border-gray-200 shadow-lg p-2 space-y-1 max-h-80 overflow-y-auto">
                            {GUIDES.map((g) => (
                                <NavLink
                                    key={g.id}
                                    to={`/mi-espacio/admin/guias/${g.id}`}
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                            isActive
                                                ? "bg-yambo-green-50 text-yambo-green-700 font-semibold"
                                                : "text-gray-600 hover:bg-gray-50"
                                        }`
                                    }
                                >
                                    <FontAwesomeIcon icon={g.icon} className="w-4 h-4 flex-shrink-0" />
                                    <span>{g.title}</span>
                                </NavLink>
                            ))}
                        </nav>
                    )}
                </div>

                <Outlet />

                {/* Botón volver arriba */}
                {showTop && (
                    <button
                        type="button"
                        onClick={scrollToTop}
                        aria-label="Volver arriba"
                        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-11 h-11 rounded-full bg-yambo-green-600 text-white shadow-lg hover:bg-yambo-green-700 transition-all flex items-center justify-center"
                    >
                        <FontAwesomeIcon icon={faArrowUp} className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
