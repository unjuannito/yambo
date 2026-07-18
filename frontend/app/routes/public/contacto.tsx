import { useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getContactSettings } from "~/services/publicService.server";
import { projectColor } from "~/utils/projectColor";
import type { Route } from "./+types/contacto";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faTiktok } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { getSiteUrl } from "~/utils/env.server";
import { contactPageJsonLd, breadcrumbJsonLd } from "~/utils/jsonld";
import { fireEmojiRain } from "~/utils/confetti";

export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    const siteUrl = data?.siteUrl ?? "";
    const title = t("public.contactPageTitle");
    const description = t("public.contactMetaDescription");

    return [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: t("public.contactKeywords") },
        { tagName: "link", rel: "canonical", href: `${siteUrl}/contacto` },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${siteUrl}/contacto` },
        { property: "og:type", content: "website" },
        { name: "robots", content: "index, follow" },
        { "script:ld+json": contactPageJsonLd({ siteUrl }) },
        {
            "script:ld+json": breadcrumbJsonLd([
                { name: t("nav.home"), url: siteUrl },
                { name: t("public.contactTitle"), url: `${siteUrl}/contacto` },
            ]),
        },
    ];
}

interface ContactCard {
    key: string;
    icon: IconDefinition;
    href?: (value: string) => string;
}

const CONTACT_CARDS: ContactCard[] = [
    {
        key: "contact.email",
        icon: faEnvelope,
        href: (v) => `mailto:${v}`,
    },
];

interface SocialLink {
    key: string;
    icon: IconDefinition;
    href: (value: string) => string;
}

const SOCIAL_LINKS: SocialLink[] = [
    {
        key: "contact.instagram",
        icon: faInstagram,
        href: (v) =>
            v.startsWith("http")
                ? v
                : `https://instagram.com/${v.replace("@", "")}`,
    },
    {
        key: "contact.tiktok",
        icon: faTiktok,
        href: (v) =>
            v.startsWith("http")
                ? v
                : `https://tiktok.com/@${v.replace("@", "")}`,
    },
];

function getContactLabel(key: string) {
    switch (key) {
        case "contact.email":
            return "public.contactEmail";
        default:
            return "";
    }
}

function getContactDesc(key: string) {
    switch (key) {
        case "contact.email":
            return "public.contactEmailDesc";
        default:
            return "";
    }
}

function getSocialLabel(key: string) {
    switch (key) {
        case "contact.instagram":
            return "public.contactInstagram";
        case "contact.tiktok":
            return "public.contactTikTok";
        default:
            return "";
    }
}

function getSocialDesc(key: string) {
    switch (key) {
        case "contact.instagram":
            return "public.contactInstagramDesc";
        case "contact.tiktok":
            return "public.contactTikTokDesc";
        default:
            return "";
    }
}

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
    const { t } = useTranslation();
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
            fireEmojiRain("*");
            setSecretMessage(true);
            setTimeout(() => setSecretMessage(false), 4000);
        }
    }

    const activeCards = CONTACT_CARDS.filter((c) => settings[c.key]?.trim());
    const activeSocials = SOCIAL_LINKS.filter((s) => settings[s.key]?.trim());
    const hasAnyContent = activeCards.length > 0 || activeSocials.length > 0;

    return (
        <section className="w-full bg-gradient-to-b from-yambo-green-50/30 to-yambo-white min-h-screen pt-12 pb-16">
            <div className="max-w-8xl mx-auto px-4">
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold text-yambo-black mb-2 font-display fade-up">
                        {t("public.contactTitle")}
                    </h1>
                    <p
                        className="text-gray-500 text-lg fade-up"
                        style={{ animationDelay: "0.05s" }}
                    >
                        {t("public.contactHeroDesc")}
                    </p>
                </div>

                {/* Content Section */}
                {hasAnyContent ? (
                    <div className="space-y-10">
                        {/* Direct Contact Methods */}
                        {activeCards.length > 0 && (
                            <div
                                className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-up"
                                style={{ animationDelay: "0.1s" }}
                            >
                                {activeCards.map((card) => {
                                    const value = settings[card.key];
                                    const { bg, text, border } = projectColor(
                                        card.key,
                                    );
                                    return (
                                        <div
                                            key={card.key}
                                            className="flex items-start gap-5 rounded-3xl border bg-white p-6 shadow-sm hover:shadow-md transition-all hover-lift"
                                            style={{ borderColor: border }}
                                        >
                                            <div
                                                className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                                                style={{ backgroundColor: bg }}
                                            >
                                                <FontAwesomeIcon
                                                    icon={card.icon}
                                                    className="w-6 h-6"
                                                    style={{ color: text }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <h3
                                                    className="text-xs font-bold uppercase tracking-wide mb-1"
                                                    style={{ color: text }}
                                                >
                                                    {t(
                                                        getContactLabel(
                                                            card.key,
                                                        ),
                                                    )}
                                                </h3>
                                                <p className="text-xs text-gray-400 mb-2">
                                                    {t(
                                                        getContactDesc(
                                                            card.key,
                                                        ),
                                                    )}
                                                </p>
                                                {card.href ? (
                                                    <a
                                                        href={card.href(value)}
                                                        className="text-yambo-black font-semibold hover:text-yambo-green-600 transition-colors break-all text-base"
                                                    >
                                                        {value}
                                                    </a>
                                                ) : (
                                                    <p className="text-yambo-black font-semibold whitespace-pre-line text-base">
                                                        {value}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Social Media Links */}
                        {activeSocials.length > 0 && (
                            <div
                                className="fade-up"
                                style={{ animationDelay: "0.15s" }}
                            >
                                <h2 className="text-xl font-bold text-yambo-black mb-4 flex items-center gap-2 font-display">
                                    <FontAwesomeIcon
                                        icon={faShareNodes}
                                        className="w-5 h-5 text-yambo-purple-500"
                                    />{" "}
                                    {t("public.contactSocialsTitle")}
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeSocials.map((social) => {
                                        const value = settings[social.key];
                                        const { bg, text, border } =
                                            projectColor(social.key);
                                        return (
                                            <a
                                                key={social.key}
                                                href={social.href(value)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-start gap-4 p-5 rounded-3xl border bg-white shadow-sm hover:shadow-md transition-all hover-lift"
                                                style={{ borderColor: border }}
                                            >
                                                <div
                                                    className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                                                    style={{
                                                        backgroundColor: bg,
                                                        color: text,
                                                    }}
                                                >
                                                    <FontAwesomeIcon
                                                        icon={social.icon}
                                                        className="w-6 h-6"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-yambo-black group-hover:text-yambo-green-600 transition-colors text-sm">
                                                        {t(
                                                            getSocialLabel(
                                                                social.key,
                                                            ),
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 mb-2">
                                                        {t(
                                                            getSocialDesc(
                                                                social.key,
                                                            ),
                                                        )}
                                                    </p>
                                                    <span
                                                        className="text-xs font-semibold inline-flex items-center gap-1"
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

                        {/* Call to Action Container */}
                        <div
                            className="rounded-3xl bg-gradient-to-br from-yambo-green-50/50 to-yambo-purple-50/50 border border-gray-150 p-8 text-center fade-up"
                            style={{ animationDelay: "0.2s" }}
                        >
                            <h3 className="text-xl font-bold text-yambo-black mb-2 font-display">
                                {t("public.contactCtaTitle")}
                            </h3>
                            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                                {t("public.contactCtaDesc")}
                            </p>
                            {activeCards.some(
                                (c) => c.key === "contact.email",
                            ) && (
                                <a
                                    href={`mailto:${settings["contact.email"]}`}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yambo-black text-white text-sm font-semibold hover:bg-gray-800 shadow-sm transition-all active:scale-95"
                                >
                                    <FontAwesomeIcon
                                        icon={faEnvelope}
                                        className="w-4 h-4"
                                    />{" "}
                                    {t("public.contactCtaButton")}
                                </a>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Empty State matches monitors' pattern exactly */
                    <div className="text-center py-20 mt-6 fade-up">
                        <p className="text-6xl mb-4">-</p>
                        <h2 className="text-xl font-bold text-yambo-black mb-2 font-display">
                            {t("public.contactEmptyTitle")}
                        </h2>
                        <p className="text-gray-400 text-base max-w-md mx-auto">
                            {t("public.contactEmptyDesc")}{" "}
                            <a
                                href="/"
                                className="text-yambo-green-600 hover:underline font-semibold"
                            >
                                {t("public.contactEmptyLink")}
                            </a>
                            .
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
