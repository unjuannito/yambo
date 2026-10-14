import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useKonamiCode } from "~/hooks/useKonamiCode";
import { fireFireworks } from "~/utils/confetti";
import { variantUrl } from "~/utils/imageVariants";

interface HeroProps {
    title?: string;
    subtitle?: string;
    image?: string;
}

const DEFAULT_IMAGE = "/heroImage.jpg";

export default function Hero({ title, subtitle, image }: HeroProps) {
    const { t } = useTranslation();
    const DEFAULT_TITLE = t('home.heroTitle');
    const DEFAULT_SUBTITLE = t('home.heroSubtitle');
    const SECRET_TITLE = t('home.secretTitle');
    const SECRET_SUBTITLE = t('home.secretSubtitle');
    const konamiActivated = useKonamiCode(5000);
    const [showSecret, setShowSecret] = useState(false);

    useEffect(() => {
        if (!konamiActivated) return;

        setShowSecret(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        fireFireworks();

        const unlockTimer = setTimeout(() => {
            document.body.style.overflow = originalOverflow;
        }, 1500);

        return () => {
            clearTimeout(unlockTimer);
            document.body.style.overflow = originalOverflow;
        };
    }, [konamiActivated]);


    useEffect(() => {
        if (!showSecret) return;

        const secretTimer = setTimeout(() => {
            setShowSecret(false);
        }, 5000);

        return () => clearTimeout(secretTimer);
    }, [showSecret]);

    // Una portada subida pesa varios MB: de fondo basta su versión de 1600 px
    const heroImage = variantUrl(image, 1600) ?? (image || DEFAULT_IMAGE);

    return (
        <section
            className={`w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-4 bg-cover bg-center bg-no-repeat overflow-hidden`}
            style={{
                backgroundImage: `
                    linear-gradient(to bottom right,
                        rgb(0 0 0 / 0.7),
                        rgb(0 0 0 / 0.5),
                        rgb(88 28 135 / 0.2)
                    ),
                    url(${heroImage})
                `,
            }}
        >
            {showSecret ? (
                <>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-5 text-white leading-tight transition-all duration-500 font-display scale-110 max-w-3xl">
                        {SECRET_TITLE}
                    </h1>
                    <p className="text-lg md:text-xl mb-8 transition-all duration-500 text-yambo-gold max-w-3xl">
                        {SECRET_SUBTITLE}
                    </p>
                    <p className="text-sm text-white/50 ee-slide-down max-w-3xl">
                        ↑↑↓↓←→←→BA — ¡Lo lograste!
                    </p>
                </>
            ) : (
                <>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-5 text-white leading-tight transition-all duration-500 font-display fade-up max-w-3xl">
                        {title || DEFAULT_TITLE}
                    </h1>
                    <p className="text-lg md:text-xl mb-8 transition-all duration-500 fade-up text-white/80 max-w-3xl" style={{ animationDelay: "0.15s" }}>
                        {subtitle || DEFAULT_SUBTITLE}
                    </p>
                    <menu className="fade-up flex flex-wrap justify-center gap-3 max-w-3xl" style={{ animationDelay: "0.3s" }} >
                        <a href="/proyectos" className="px-7 py-3 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold shadow-lg hover:shadow-yambo-green-400/30 hover:shadow-xl transition-all hover-pop" >
                            {t("public.ctaProjects")}
                        </a>

                        <a href="/contacto" className="px-7 py-3 bg-white/15 backdrop-blur-sm text-white border border-white/30 rounded-full font-semibold hover:bg-white/25 transition-all hover-pop" >
                            {t("public.ctaContact")}
                        </a>
                    </menu>
                </>
            )}

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 float-anim">
                <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
                    <div className="w-1 h-3 bg-white/60 rounded-full animate-bounce" />
                </div>
            </div>
        </section>
    );
}
