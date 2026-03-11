import React, { useState, useEffect } from "react";
import { useKonamiCode } from "~/hooks/useKonamiCode";
import { fireFireworks } from "~/utils/confetti";

interface HeroProps {
    title?: string;
    subtitle?: string;
    image?: string;
    loading?: boolean;
}

const DEFAULT_TITLE = "Vive, Aprende y Crece con Yambo";
const DEFAULT_SUBTITLE = "La asociación juvenil de Alcobendas para impulsar tu talento y pasiones.";
const DEFAULT_IMAGE = "/heroImage.jpg";
const SECRET_TITLE = "¡Has encontrado el secreto de Yambo! 🎉";
const SECRET_SUBTITLE = "Eres oficialmente un/a Yambero de élite ✨";

export default function Hero({ title, subtitle, image, loading }: HeroProps) {
    const konamiActivated = useKonamiCode(5000);
    const [showSecret, setShowSecret] = useState(false);

    useEffect(() => {
        if (konamiActivated) {
            setShowSecret(true);
            fireFireworks();
            const timer = setTimeout(() => setShowSecret(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [konamiActivated]);

    return (
        <section
            className={`relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden ${showSecret ? "ee-hero-secret" : ""}`}
        >
            {/* Background image */}
            <img
                src={image || DEFAULT_IMAGE}
                className="absolute inset-0 w-full h-full object-cover ee-hero-overlay transition-all duration-500"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-yambo-black/70 via-yambo-black/50 to-yambo-purple-900/40" />

            {/* Decorative floating blobs */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-yambo-green-500/10 rounded-full blur-3xl float-anim" />
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-yambo-purple-500/10 rounded-full blur-3xl float-anim" style={{ animationDelay: "1.5s" }} />

            <div className="relative z-10 text-center max-w-3xl px-4">
                {loading ? (
                    <>
                        <div className="h-14 w-3/4 mx-auto mb-4 bg-white/20 rounded-2xl animate-pulse" />
                        <div className="h-7 w-1/2 mx-auto mb-6 bg-white/20 rounded-xl animate-pulse" />
                    </>
                ) : (
                    <>
                        <h1
                            className={`text-4xl md:text-6xl font-extrabold mb-5 text-white leading-tight transition-all duration-500 font-display ${showSecret ? "scale-110" : "fade-up"}`}
                        >
                            {showSecret ? SECRET_TITLE : (title || DEFAULT_TITLE)}
                        </h1>
                        <p
                            className={`text-lg md:text-xl mb-8 transition-all duration-500 fade-up ${showSecret ? "text-yambo-gold" : "text-white/80"}`}
                            style={{ animationDelay: "0.15s" }}
                        >
                            {showSecret ? SECRET_SUBTITLE : (subtitle || DEFAULT_SUBTITLE)}
                        </p>
                        {showSecret ? (
                            <p className="text-sm text-white/50 ee-slide-down">
                                ↑↑↓↓←→←→BA — ¡Lo lograste!
                            </p>
                        ) : (
                            <div className="fade-up flex flex-wrap justify-center gap-3" style={{ animationDelay: "0.3s" }}>
                                <a
                                    href="/proyectos"
                                    className="px-7 py-3 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold shadow-lg hover:shadow-yambo-green-400/30 hover:shadow-xl transition-all hover-pop"
                                >
                                    Descubre proyectos
                                </a>
                                <a
                                    href="/contacto"
                                    className="px-7 py-3 bg-white/15 backdrop-blur-sm text-white border border-white/30 rounded-full font-semibold hover:bg-white/25 transition-all hover-pop"
                                >
                                    Contáctanos
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 float-anim">
                <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
                    <div className="w-1 h-3 bg-white/60 rounded-full animate-bounce" />
                </div>
            </div>
        </section>
    );
}
