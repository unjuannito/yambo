import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";

import { useState, useEffect, useCallback, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import { DialogProvider } from "./context/DialogContext";
import { Toaster } from "react-hot-toast";
import { fireFireworks } from "./utils/confetti";
import { useWebSocket } from "./hooks/useWebSocket";
import { useBatchProgress } from "./hooks/useBatchProgress";
import "./i18n/config";
import { useTranslation } from "react-i18next";

import type { Route } from "./+types/root";
import "./app.css";

function WebSocketProvider({ children }: { children: React.ReactNode }) {
    useWebSocket();
    useBatchProgress();
    return <>{children}</>;
}

export const links: Route.LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
    },
    { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
];

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
            <body className="min-h-screen bg-yambo-white text-yambo-black">
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            borderRadius: "9999px",
                            padding: "8px 16px",
                            fontWeight: 500,
                        },
                        success: {
                            duration: 3000,
                            iconTheme: {
                                primary: "#33a35e",
                                secondary: "#fff",
                            },
                        },
                        error: {
                            duration: 5000,
                            iconTheme: {
                                primary: "#ff6b6b",
                                secondary: "#fff",
                            },
                        },
                    }}
                />
                <AuthProvider>
                    <DialogProvider>
                        <WebSocketProvider>
                            <Suspense fallback={null}>
                                <Outlet />
                            </Suspense>
                        </WebSocketProvider>
                    </DialogProvider>
                </AuthProvider>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const { t } = useTranslation();
    let message = t('errors.generic.title');
    let details = t('errors.generic.message');
    let stack: string | undefined;
    let is404 = false;

    if (isRouteErrorResponse(error)) {
        is404 = error.status === 404;
        message = is404 ? t('errors.404.title') : t('errors.generic.title');
        details =
            error.status === 404
                ? t('errors.404.message')
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
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap"
                />
            </head>
            <body className="bg-yambo-white text-yambo-black" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                {is404 ? (
                    <CatchTheLogoGame />
                ) : (
                    <main className="min-h-screen items-center justify-center flex flex-col gap-4 relative overflow-hidden">
                        <div className="blob-green -top-20 -left-20" />
                        <div className="blob-purple top-40 -right-20" />
                        <h1 className="font-bold text-5xl gradient-text">{message}</h1>
                        <p className="text-xl text-gray-600">{details}</p>
                        {stack && (
                            <pre className="w-full max-w-2xl p-4 overflow-x-auto bg-yambo-black text-gray-100 rounded-2xl text-sm">
                                <code>{stack}</code>
                            </pre>
                        )}
                        <a
                            href="/"
                            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold hover:shadow-lg transition-all hover-pop"
                        >
                            {t('errors.goHome')}
                        </a>
                    </main>
                )}
                <Scripts />
            </body>
        </html>
    );
}

// ── 404 Easter Egg: Catch the Logo Game ──────────────────────────────────

function CatchTheLogoGame() {
    const { t } = useTranslation();
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
        <main className="min-h-screen bg-gradient-to-br from-yambo-green-50 via-white to-yambo-purple-50 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="blob-green top-10 left-10 opacity-60" />
            <div className="blob-purple bottom-20 right-10 opacity-60" />

            {/* Header */}
            <div className="text-center pt-12 relative z-10">
                <h1 className="text-7xl font-black gradient-text mb-3">404</h1>
                <p className="text-xl text-gray-600 mb-2">
                    {t('errors.404.message')}
                </p>
                {!gameWon && (
                    <p className="text-sm text-yambo-green-600 font-semibold animate-pulse">
                        {t('404game.subtitle', { catches, target: TARGET_CATCHES })}
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
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCatch(); } }}
                    role="button"
                    tabIndex={0}
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
                    <div className="text-center bounce-in glass rounded-3xl p-10 shadow-2xl max-w-md mx-4">
                        <div className="text-6xl mb-4">{t('404game.won')}</div>
                        <h2 className="text-3xl font-bold text-yambo-black mb-2">
                            {t('404game.wonMessage')}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {t('404game.title')} {TARGET_CATCHES} {t('common.times')}.
                        </p>
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yambo-green-500 to-yambo-purple-500 text-white rounded-full font-semibold hover:shadow-lg transition-all hover-pop"
                        >
                            {t('errors.goHome')}
                        </a>
                    </div>
                </div>
            )}

            {/* Catch counter dots */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {Array.from({ length: TARGET_CATCHES }).map((_, i) => (
                    <div
                        key={`catch-dot-${i}`}
                        className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            i < catches
                                ? "bg-gradient-to-br from-yambo-green-400 to-yambo-purple-400 scale-110 shadow-md"
                                : "bg-gray-200"
                        }`}
                    />
                ))}
            </div>
        </main>
    );
}
