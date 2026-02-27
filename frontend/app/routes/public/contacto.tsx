import { useLoaderData } from "react-router";
import { getContactSettings } from "~/services/publicService.server";
import type { ContactSettings } from "~/services/publicService";
import { hashColor } from "~/utils/hashColor";
import type { Route } from "./+types/contacto";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faComments, faShareNodes, faInbox } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faTiktok } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { getSiteUrl } from "~/utils/env.server";
import { contactPageJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";

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

    const activeCards = CONTACT_CARDS.filter((c) => settings[c.key]?.trim());
    const activeSocials = SOCIAL_LINKS.filter((s) => settings[s.key]?.trim());
    const hasAnyContent = activeCards.length > 0 || activeSocials.length > 0;

    return (
        <section className="w-full bg-white min-h-screen pt-24 pb-16">
            {/* Hero banner */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-5">
                        <FontAwesomeIcon icon={faComments} className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Contacto
                    </h1>
                    <p className="text-gray-600 text-lg max-w-xl mx-auto">
                        ¿Tienes alguna pregunta o quieres saber más sobre
                        nosotros? Estamos encantados de ayudarte.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-6">
                {hasAnyContent ? (
                    <div className="space-y-8">
                        {/* Contact info cards */}
                        {activeCards.length > 0 && (
                            <div className="grid grid-cols-1 gap-4">
                                {activeCards.map((card) => {
                                    const value = settings[card.key];
                                    const { bg, text, border } = hashColor(
                                        card.key,
                                    );
                                    return (
                                        <div
                                            key={card.key}
                                            className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                                            style={{ borderColor: border }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                                                    style={{
                                                        backgroundColor: bg,
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={card.icon} className="w-6 h-6" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3
                                                        className="text-sm font-semibold uppercase tracking-wide mb-0.5"
                                                        style={{ color: text }}
                                                    >
                                                        {card.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        {card.description}
                                                    </p>
                                                    {card.href ? (
                                                        <a
                                                            href={card.href(
                                                                value,
                                                            )}
                                                            className="text-gray-900 font-medium hover:underline break-all text-lg"
                                                        >
                                                            {value}
                                                        </a>
                                                    ) : (
                                                        <p className="text-gray-900 font-medium whitespace-pre-line text-lg">
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
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faShareNodes} className="w-5 h-5" /> Síguenos en redes
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {activeSocials.map((social) => {
                                        const value = settings[social.key];
                                        const { bg, text, border } = hashColor(
                                            social.key,
                                        );
                                        return (
                                            <a
                                                key={social.key}
                                                href={social.href(value)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-start gap-4 p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all"
                                                style={{ borderColor: border }}
                                            >
                                                <div
                                                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                                                    style={{
                                                        backgroundColor: bg,
                                                        color: text,
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={social.icon} className="w-7 h-7" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {social.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mb-1">
                                                        {social.description}
                                                    </p>
                                                    <span
                                                        className="text-sm font-medium"
                                                        style={{ color: text }}
                                                    >
                                                        {displaySocialValue(
                                                            social.key,
                                                            value,
                                                        )}{" "}
                                                        →
                                                    </span>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* CTA section */}
                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                ¿Quieres formar parte de Yambo?
                            </h3>
                            <p className="text-gray-600 mb-5 max-w-md mx-auto">
                                Si te interesa participar como monitor o
                                colaborar con nosotros, no dudes en contactarnos.
                            </p>
                            {activeCards.some(
                                (c) => c.key === "contact.email",
                            ) && (
                                <a
                                    href={`mailto:${settings["contact.email"]}`}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5" /> Envíanos un correo
                                </a>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="text-center py-20 mt-6">
                        <div className="mb-5 flex justify-center"><FontAwesomeIcon icon={faInbox} className="w-16 h-16 text-gray-400" /></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Próximamente
                        </h2>
                        <p className="text-gray-500 text-lg max-w-md mx-auto">
                            La información de contacto estará disponible en
                            breve. Mientras tanto, puedes volver a la{" "}
                            <a
                                href="/"
                                className="text-blue-600 hover:underline"
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
