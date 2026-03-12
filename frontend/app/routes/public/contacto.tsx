import { useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { getContactSettings } from "~/services/publicService.server";
import type { ContactSettings } from "~/services/publicService";
import { projectColor } from "~/utils/projectColor";
import type { Route } from "./+types/contacto";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faComments, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faTiktok } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { getSiteUrl } from "~/utils/env.server";
import { contactPageJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import { fireEmojiRain } from "~/utils/confetti";

export function meta({ data }: Route.MetaArgs) {
    const siteUrl = data?.siteUrl ?? "";
    const title = "Yambo - Contacto | Asociación Juvenil en Alcobendas";
    const description = "Ponte en contacto con Yambo, asociación juvenil en Alcobendas (Madrid). Escríbenos o síguenos en redes sociales.";

    return [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: "contacto Yambo, asociación juvenil Alcobendas, Madrid, redes sociales" },
        { tagName: "link", rel: "canonical", href: `${siteUrl}/contacto` },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${siteUrl}/contacto` },
        { property: "og:type", content: "website" },
        { name: "robots", content: "index, follow" },
        { "script:ld+json": contactPageJsonLd({ siteUrl }) },
        { "script:ld+json": breadcrumbJsonLd([
            { name: "Inicio", url: siteUrl },
            { name: "Contacto", url: `${siteUrl}/contacto` },
        ]) },
    ];
}

interface ContactCard {
    key: string;
    label: string;
    icon: IconDefinition;
    description: string;
    href?: (value: string) => string;
}

const CONTACT_CARDS: ContactCard[] = [
    {
        key: "contact.email",
        label: "Correo electrónico",
        icon: faEnvelope,
        description: "Escríbenos y te responderemos lo antes posible.",
        href: (v) => `mailto:${v}`,
    },
];

interface SocialLink {
    key: string;
    label: string;
    description: string;
    icon: IconDefinition;
    href: (value: string) => string;
}

const SOCIAL_LINKS: SocialLink[] = [
    {
        key: "contact.instagram",
        label: "Instagram",
        description: "Síguenos para ver nuestras actividades y novedades.",
        icon: faInstagram,
        href: (v) =>
            v.startsWith("http")
                ? v
                : `https://instagram.com/${v.replace("@", "")}`,
    },
    {
        key: "contact.tiktok",
        label: "TikTok",
        description: "Descubre nuestros vídeos y contenido exclusivo.",
        icon: faTiktok,
        href: (v) =>
            v.startsWith("http")
                ? v
                : `https://tiktok.com/@${v.replace("@", "")}`,
    },
];

function displaySocialValue(key: string, value: string): string {
    if (value.startsWith("http")) return value;
    const handle = value.replace("@", "");
    return `@${handle}`;
}

export async function loader() {
    const settings = await getContactSettings();
    return { settings, siteUrl: getSiteUrl() };
}

export default function Contacto() {
    const { settings } = useLoaderData<typeof loader>();
    const [iconWobble, setIconWobble] = useState(false);
    const [secretMessage, setSecretMessage] = useState(false);
    const iconClicksRef = useRef(0);
    const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleIconClick() {
        iconClicksRef.current++;
        setIconWobble(true);
        setTimeout(() => setIconWobble(false), 600);

        if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
        iconTimerRef.current = setTimeout(() => {
            iconClicksRef.current = 0;
        }, 3000);

        if (iconClicksRef.current >= 5) {
            iconClicksRef.current = 0;
            fireEmojiRain("💬");
            setSecretMessage(true);
            setTimeout(() => setSecretMessage(false), 4000);
        }
    }

    const activeCards = CONTACT_CARDS.filter((c) => settings[c.key]?.trim());
    const activeSocials = SOCIAL_LINKS.filter((s) => settings[s.key]?.trim());
    const hasAnyContent = activeCards.length > 0 || activeSocials.length > 0;

    return (
        <section className="w-full bg-yambo-white min-h-screen pt-24 pb-16">
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-yambo-green-50/40 via-yambo-purple-50/30 to-yambo-green-50/20 border-b border-yambo-green-100/50 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="blob-green w-40 h-40 -top-10 -right-10 opacity-20" />
                <div className="blob-purple w-32 h-32 -bottom-8 -left-8 opacity-15" />

                <div className="max-w-4xl mx-auto px-4 py-14 text-center relative z-10">
                    <div
                        className={`inline-flex items-center justify-center w-18 h-18 rounded-full bg-white shadow-md mb-5 cursor-pointer select-none transition-transform ${iconWobble ? "ee-wobble" : "hover:scale-110"}`}
                        onClick={handleIconClick}
                    >
                        <FontAwesomeIcon icon={faComments} className="w-9 h-9 text-yambo-green-500" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-yambo-black mb-3 font-display fade-up">
                        Contacto
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto fade-up" style={{ animationDelay: "0.05s" }}>
                        ¿Tienes alguna pregunta o quieres saber más sobre
                        nosotros? Estamos encantados de ayudarte. 💌
                    </p>
                    {secretMessage && (
                        <p className="mt-3 text-sm text-yambo-purple-600 font-medium ee-slide-down">
                            Psst... también puedes mandarnos una paloma mensajera 🕊️
                        </p>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
                {hasAnyContent ? (
                    <div className="space-y-8">
                        {/* Contact info cards */}
                        {activeCards.length > 0 && (
                            <div className="grid grid-cols-1 gap-4">
                                {activeCards.map((card) => {
                                    const value = settings[card.key];
                                    const { bg, text, border } = projectColor(card.key);
                                    return (
                                        <div
                                            key={card.key}
                                            className="rounded-3xl border bg-white p-7 shadow-sm hover:shadow-lg transition-all hover-lift fade-up"
                                            style={{ borderColor: border }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                                                    style={{ backgroundColor: bg }}
                                                >
                                                    <FontAwesomeIcon icon={card.icon} className="w-7 h-7" style={{ color: text }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3
                                                        className="text-sm font-bold uppercase tracking-wide mb-0.5"
                                                        style={{ color: text }}
                                                    >
                                                        {card.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-400 mb-2">
                                                        {card.description}
                                                    </p>
                                                    {card.href ? (
                                                        <a
                                                            href={card.href(value)}
                                                            className="text-yambo-black font-semibold hover:text-yambo-green-600 transition-colors break-all text-lg"
                                                        >
                                                            {value}
                                                        </a>
                                                    ) : (
                                                        <p className="text-yambo-black font-semibold whitespace-pre-line text-lg">
                                                            {value}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Social media */}
                        {activeSocials.length > 0 && (
                            <div className="fade-up" style={{ animationDelay: "0.15s" }}>
                                <h2 className="text-xl font-bold text-yambo-black mb-4 flex items-center gap-2 font-display">
                                    <FontAwesomeIcon icon={faShareNodes} className="w-5 h-5 text-yambo-purple-500" /> Síguenos en redes
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {activeSocials.map((social) => {
                                        const value = settings[social.key];
                                        const { bg, text, border } = projectColor(social.key);
                                        return (
                                            <a
                                                key={social.key}
                                                href={social.href(value)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-start gap-4 p-6 rounded-3xl border bg-white shadow-sm hover:shadow-lg transition-all hover-lift"
                                                style={{ borderColor: border }}
                                            >
                                                <div
                                                    className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: bg, color: text }}
                                                >
                                                    <FontAwesomeIcon icon={social.icon} className="w-8 h-8" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-yambo-black group-hover:text-yambo-green-600 transition-colors">
                                                        {social.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-400 mb-1">
                                                        {social.description}
                                                    </p>
                                                    <span
                                                        className="text-sm font-semibold"
                                                        style={{ color: text }}
                                                    >
                                                        {displaySocialValue(social.key, value)} →
                                                    </span>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* CTA section */}
                        <div className="rounded-3xl bg-gradient-to-br from-yambo-green-50 to-yambo-purple-50 border border-yambo-green-100/50 p-10 text-center fade-up" style={{ animationDelay: "0.25s" }}>
                            <h3 className="text-xl font-bold text-yambo-black mb-2 font-display">
                                ¿Quieres formar parte de Yambo? 🌟
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Si te interesa participar como monitor o
                                colaborar con nosotros, no dudes en contactarnos.
                            </p>
                            {activeCards.some((c) => c.key === "contact.email") && (
                                <a
                                    href={`mailto:${settings["contact.email"]}`}
                                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white font-semibold hover:shadow-lg hover:shadow-yambo-green-200 transition-all active:scale-95"
                                >
                                    <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5" /> Envíanos un correo
                                </a>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="text-center py-20 mt-6">
                        <p className="text-6xl mb-5">📭</p>
                        <h2 className="text-xl font-bold text-yambo-black mb-2 font-display">
                            Próximamente
                        </h2>
                        <p className="text-gray-400 text-lg max-w-md mx-auto">
                            La información de contacto estará disponible en
                            breve. Mientras tanto, puedes volver a la{" "}
                            <a
                                href="/"
                                className="text-yambo-green-600 hover:underline font-semibold"
                            >
                                página principal
                            </a>
                            .
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
