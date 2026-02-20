import React from "react";

interface HeroProps {
    title?: string;
    subtitle?: string;
    image?: string;
    loading?: boolean;
}

const DEFAULT_TITLE = "Vive, Aprende y Crece con Yambo";
const DEFAULT_SUBTITLE = "La asociación juvenil de Alcobendas para impulsar tu talento y pasiones.";
const DEFAULT_IMAGE = "/heroImage.jpg";

export default function Hero({ title, subtitle, image, loading }: HeroProps) {
    return (
        <section className="relative w-full h-[80vh] flex items-center justify-center bg-black text-white overflow-hidden">
            <img
                src={image || DEFAULT_IMAGE}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="relative z-10 text-center max-w-3xl px-4">
                {loading ? (
                    <>
                        <div className="h-12 w-3/4 mx-auto mb-4 bg-white/20 rounded animate-pulse" />
                        <div className="h-6 w-1/2 mx-auto mb-6 bg-white/20 rounded animate-pulse" />
                    </>
                ) : (
                    <>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            {title || DEFAULT_TITLE}
                        </h1>
                        <p className="text-lg md:text-xl mb-6">
                            {subtitle || DEFAULT_SUBTITLE}
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}
