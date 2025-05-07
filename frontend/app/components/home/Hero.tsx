import React from "react";

export default function Hero() {
    return (
        <section className="relative w-full h-[80vh] flex items-center justify-center bg-black text-white overflow-hidden">
            <img
                src="/heroImage.jpg"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="relative z-10 text-center max-w-3xl px-4">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Vive, Aprende y Crece con Yambo
                </h1>
                <p className="text-lg md:text-xl mb-6">
                    La asociación juvenil de Alcobendas para impulsar tu talento y pasiones.
                </p>
            </div>
        </section>
    );
}
