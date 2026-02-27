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
            className={`relative w-full h-[80vh] flex items-center justify-center bg-black text-white overflow-hidden ${showSecret ? "ee-hero-secret" : ""}`}
        >
            <img
                src={image || DEFAULT_IMAGE}
                className="absolute inset-0 w-full h-full object-cover opacity-40 ee-hero-overlay transition-all duration-500"
            />
            <div className="relative z-10 text-center max-w-3xl px-4">
                {loading ? (
                    <>
                        <div className="h-12 w-3/4 mx-auto mb-4 bg-white/20 rounded animate-pulse" />
                        <div className="h-6 w-1/2 mx-auto mb-6 bg-white/20 rounded animate-pulse" />
                    </>
                ) : (
                    <>
                        <h1
                            className={`text-4xl md:text-5xl font-bold mb-4 transition-all duration-500 ${showSecret ? "scale-110" : ""}`}
                        >
                            {showSecret ? SECRET_TITLE : (title || DEFAULT_TITLE)}
                        </h1>
                        <p
                            className={`text-lg md:text-xl mb-6 transition-all duration-500 ${showSecret ? "text-yellow-300" : ""}`}
                        >
                            {showSecret ? SECRET_SUBTITLE : (subtitle || DEFAULT_SUBTITLE)}
                        </p>
                        {showSecret && (
                            <p className="text-sm text-white/60 ee-slide-down">
                                ↑↑↓↓←→←→BA — ¡Lo lograste!
                            </p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
