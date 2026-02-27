import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";

import { useState, useEffect, useCallback } from "react";
import { AuthProvider } from "./context/AuthContext";
import { DialogProvider } from "./context/DialogContext";
import { Toaster } from "react-hot-toast";
import { fireFireworks } from "./utils/confetti";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
    { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
];

// This is the main Document component that wraps the entire app
export default function Document() {
    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link
                    rel="shortcut icon"
                    href="/logo.png"
                    type="image/x-icon"
                />
                <Meta />
                <Links />
            </head>
            <body className="min-h-screen ">
                <Toaster
                    position="top-right"
                    toastOptions={{
                        success: {
                            duration: 3000,
                            iconTheme: {
                                primary: "#10b981",
                                secondary: "#fff",
                            },
                        },
                        error: {
                            duration: 5000,
                            iconTheme: {
                                primary: "#ef4444",
                                secondary: "#fff",
                            },
                        },
                    }}
                />
                <AuthProvider>
                    <DialogProvider>
                        <Outlet />
                    </DialogProvider>
                </AuthProvider>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;
    let is404 = false;

    if (isRouteErrorResponse(error)) {
        is404 = error.status === 404;
        message = is404 ? "Error 404" : "Error";
        details =
            error.status === 404
                ? "No se ha encontrado esta pagina."
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <Meta />
                <Links />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap"
                />
            </head>
            <body style={{ fontFamily: "'Inter', sans-serif" }}>
                {is404 ? (
                    <CatchTheLogoGame />
                ) : (
                    <main className="min-h-screen items-center justify-center flex flex-col">
                        <h1 className="font-bold text-4xl p-4">{message}</h1>
                        <p className="text-2xl p-4">{details}</p>
                        {stack && (
                            <pre className="w-full p-4 overflow-x-auto">
                                <code>{stack}</code>
                            </pre>
                        )}
                    </main>
                )}
                <Scripts />
            </body>
        </html>
    );
}

// ── 404 Easter Egg: Catch the Logo Game ──────────────────────────────────

function CatchTheLogoGame() {
    const [catches, setCatches] = useState(0);
    const [gameWon, setGameWon] = useState(false);
    const [position, setPosition] = useState({ top: 40, left: 40 });
    const TARGET_CATCHES = 5;

    const moveTarget = useCallback(() => {
        setPosition({
            top: 15 + Math.random() * 60,
            left: 10 + Math.random() * 75,
        });
    }, []);

    useEffect(() => {
        if (gameWon) return;
        const interval = setInterval(moveTarget, 1800);
        return () => clearInterval(interval);
    }, [gameWon, moveTarget]);

    const handleCatch = useCallback(() => {
        if (gameWon) return;
        const next = catches + 1;
        setCatches(next);
        moveTarget();
        if (next >= TARGET_CATCHES) {
            setGameWon(true);
            fireFireworks();
        }
    }, [catches, gameWon, moveTarget]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
            {/* Header */}
            <div className="text-center pt-12 relative z-10">
                <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
                <p className="text-xl text-gray-600 mb-2">
                    ¡Ups! Esta página no existe...
                </p>
                {!gameWon && (
                    <p className="text-sm text-blue-600 font-medium animate-pulse">
                        🎯 ¡Atrapa el logo {TARGET_CATCHES} veces! ({catches}/{TARGET_CATCHES})
                    </p>
                )}
            </div>

            {/* Moving target */}
            {!gameWon && (
                <div
                    className="ee-catch-target ee-float absolute"
                    style={{
                        top: `${position.top}%`,
                        left: `${position.left}%`,
                        transition: "top 0.5s ease-out, left 0.5s ease-out",
                    }}
                    onClick={handleCatch}
                >
                    <img
                        src="/logo.png"
                        alt="¡Atrápame!"
                        className="w-16 h-16 drop-shadow-lg"
                        draggable={false}
                    />
                </div>
            )}

            {/* Win state */}
            {gameWon && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="text-center ee-slide-down bg-white/90 backdrop-blur rounded-2xl p-10 shadow-2xl max-w-md mx-4">
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            ¡Eres increíble!
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Has atrapado el logo {TARGET_CATCHES} veces. Eres oficialmente un/a Yambero.
                        </p>
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
                        >
                            Volver al inicio →
                        </a>
                    </div>
                </div>
            )}

            {/* Catch counter dots */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {Array.from({ length: TARGET_CATCHES }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            i < catches
                                ? "bg-blue-600 scale-110"
                                : "bg-gray-300"
                        }`}
                    />
                ))}
            </div>
        </main>
    );
}
