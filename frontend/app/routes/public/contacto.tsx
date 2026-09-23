import { useRef, useState } from "react";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { getActiveProjects, getContactSettings } from "~/services/publicService.server";
import type { ActiveProject } from "~/services/publicService";
import type { Route } from "./+types/contacto";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faArrowUpRightFromSquare,
    faEnvelope,
    faShareNodes,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
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

    const instagram = data?.settings?.["contact.instagram"];
    const tiktok = data?.settings?.["contact.tiktok"];
    const email = data?.settings?.["contact.email"];

    return [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: t("public.contactKeywords") },
        { tagName: "link", rel: "canonical", href: `${siteUrl}/contacto` },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${siteUrl}/contacto` },
        { property: "og:image", content: `${siteUrl}/logo.png` },
        { property: "og:type", content: "website" },
        { name: "robots", content: "index, follow" },
        { "script:ld+json": contactPageJsonLd({ siteUrl, email, instagram, tiktok }) },
        {
            "script:ld+json": breadcrumbJsonLd([
                { name: t("nav.home"), url: siteUrl },
                { name: t("public.contactTitle"), url: `${siteUrl}/contacto` },
            ]),
        },
    ];
}

interface SocialLink {
    key: string;
    icon: IconDefinition;
    tile: string;
    href: (value: string) => string;
}

const SOCIAL_LINKS: SocialLink[] = [
    {
        key: "contact.instagram",
        icon: faInstagram,
        tile: "bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400",
        href: (v) =>
            v.startsWith("http")
                ? v
                : `https://instagram.com/${v.replace("@", "")}`,
    },
    {
        key: "contact.tiktok",
        icon: faTiktok,
        tile: "bg-gradient-to-br from-gray-900 to-gray-700",
        href: (v) =>
            v.startsWith("http")
                ? v
                : `https://tiktok.com/@${v.replace("@", "")}`,
    },
];

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

export interface CoordinationContact {
    projectId: string;
    projectName: string;
    email: string;
}

/**
 * Keeps only projects with a coordination email, pairing each email with its own project.
 * Uses the same visibility rule as /public/projects/active (active projects only).
 */
export function toCoordinationContacts(projects: ActiveProject[]): CoordinationContact[] {
    return projects
        .map((p) => ({ projectId: p.id, projectName: p.name, email: p.coordinationEmail?.trim() ?? "" }))
        .filter((c) => c.email !== "");
}

export async function loader() {
    const [settings, projects] = await Promise.all([
        getContactSettings(),
        // The general contact info must still render if the projects call fails
        getActiveProjects().catch(() => [] as ActiveProject[]),
    ]);
    return { settings, coordinationContacts: toCoordinationContacts(projects), siteUrl: getSiteUrl() };
}

export default function Contacto() {
    const { t } = useTranslation();
    const { settings, coordinationContacts = [] } = useLoaderData<typeof loader>();
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

    const mainEmail = settings["contact.email"]?.trim();
    const activeSocials = SOCIAL_LINKS.filter((s) => settings[s.key]?.trim());
    const hasAnyContent =
        !!mainEmail ||
        activeSocials.length > 0 ||
        coordinationContacts.length > 0;

    return (
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-yambo-green-50/40 via-yambo-white to-yambo-white min-h-screen pt-5 pb-8">
            {/* Decorative blobs */}
            <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-yambo-purple-50 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-yambo-green-50 blur-3xl" />

            <div className="relative max-w-6xl mx-auto px-4">
                {/* Header */}
                <header className="mb-4 max-w-2xl">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-yambo-black font-display fade-up">
                        {t("public.contactTitle")}
                    </h1>
                    <div
                        className="mt-1.5 h-1 w-12 rounded-full bg-gradient-to-r from-yambo-green-600 to-yambo-purple-500 fade-up"
                        style={{ animationDelay: "0.03s" }}
                    />
                    <p
                        className="mt-2 text-sm sm:text-base text-gray-500 fade-up"
                        style={{ animationDelay: "0.05s" }}
                    >
                        {t("public.contactHeroDesc")}
                    </p>
                </header>

                {hasAnyContent ? (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                        {/* ── Left: general email + project coordination ── */}
                        <div className="lg:col-span-3 space-y-3">
                            {mainEmail && (
                                <a
                                    href={`mailto:${mainEmail}`}
                                    className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-yambo-green-600 to-yambo-green-700 p-4 sm:p-5 text-white shadow-lg hover:shadow-xl transition-all hover-lift fade-up"
                                    style={{ animationDelay: "0.1s" }}
                                >
                                    <div aria-hidden className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-white/10" />
                                    <div aria-hidden className="absolute right-16 -top-12 h-32 w-32 rounded-full bg-white/5" />

                                    <div className="relative">
                                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                                            <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                                            {t("public.contactEmailMain")}
                                        </p>
                                        <p className="mt-1 text-lg sm:text-xl font-bold font-display break-all">
                                            {mainEmail}
                                        </p>
                                        <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                                            {t("public.contactWriteUs")}
                                            <FontAwesomeIcon
                                                icon={faArrowRight}
                                                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                                            />
                                        </span>
                                    </div>
                                </a>
                            )}

                            {/* Project coordination emails (kept separate from the general contact email) */}
                            {coordinationContacts.length > 0 && (
                                <div
                                    className="rounded-3xl border border-gray-150 bg-white p-4 shadow-sm fade-up"
                                    style={{ animationDelay: "0.15s" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yambo-green-50 text-yambo-green-600">
                                            <FontAwesomeIcon icon={faUsers} className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-lg font-bold text-yambo-black font-display">
                                            {t("public.contactCoordinationTitle")}
                                        </h2>
                                    </div>
                                    <p className="mt-1.5 text-sm text-gray-500">
                                        {t("public.contactCoordinationDesc")}
                                    </p>

                                    <ul
                                        className="mt-3 space-y-2"
                                        aria-label={t("public.contactCoordinationTitle")}
                                    >
                                        {coordinationContacts.map((contact) => (
                                            <li key={contact.projectId}>
                                                <a
                                                    href={`mailto:${contact.email}`}
                                                    className="group flex items-center gap-4 rounded-2xl border border-gray-100 px-3 py-2.5 transition-all hover:border-yambo-green-600/30 hover:bg-yambo-green-50/50"
                                                >
                                                    <span
                                                        aria-hidden
                                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yambo-green-50 text-lg font-extrabold text-yambo-green-600 font-display"
                                                    >
                                                        {contact.projectName.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-semibold text-yambo-black">
                                                            {t("public.contactCoordinationRow", {
                                                                project: contact.projectName,
                                                            })}
                                                        </span>{" "}
                                                        <span className="block truncate text-sm text-gray-500 group-hover:text-yambo-green-700 transition-colors">
                                                            {contact.email}
                                                        </span>
                                                    </span>
                                                    <FontAwesomeIcon
                                                        icon={faArrowRight}
                                                        className="h-4 w-4 flex-shrink-0 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-yambo-green-600"
                                                    />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* ── Right: socials + CTA ── */}
                        <div className="lg:col-span-2 flex flex-col gap-3">
                            {activeSocials.length > 0 && (
                                <div
                                    className="rounded-3xl border border-gray-150 bg-white p-4 shadow-sm fade-up"
                                    style={{ animationDelay: "0.2s" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yambo-purple-50 text-yambo-purple-500">
                                            <FontAwesomeIcon icon={faShareNodes} className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-lg font-bold text-yambo-black font-display">
                                            {t("public.contactSocialsTitle")}
                                        </h2>
                                    </div>

                                    <ul className="mt-3 space-y-2">
                                        {activeSocials.map((social) => {
                                            const value = settings[social.key].trim();
                                            return (
                                                <li key={social.key}>
                                                    <a
                                                        href={social.href(value)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group flex items-center gap-4 rounded-2xl border border-gray-100 px-3 py-2.5 transition-all hover:border-gray-200 hover:shadow-md hover-lift"
                                                    >
                                                        <span
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110 ${social.tile}`}
                                                        >
                                                            <FontAwesomeIcon icon={social.icon} className="h-5 w-5" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block font-bold text-yambo-black">
                                                                {t(getSocialLabel(social.key))}
                                                            </span>
                                                            <span className="block text-xs text-gray-400">
                                                                {t(getSocialDesc(social.key))}
                                                            </span>
                                                            <span className="mt-1 block truncate text-sm font-semibold text-yambo-green-600">
                                                                {displaySocialValue(social.key, value)}
                                                            </span>
                                                        </span>
                                                        <FontAwesomeIcon
                                                            icon={faArrowUpRightFromSquare}
                                                            className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-yambo-black"
                                                        />
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {/* CTA */}
                            <div
                                className="relative flex-1 overflow-hidden rounded-3xl bg-yambo-black p-4 sm:p-5 text-white shadow-lg fade-up"
                                style={{ animationDelay: "0.25s" }}
                            >
                                <div aria-hidden className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-yambo-purple-500/30 blur-2xl" />
                                <div aria-hidden className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-yambo-green-600/30 blur-2xl" />

                                <div className="relative">
                                    <h3 className="text-lg font-bold font-display">
                                        {t("public.contactCtaTitle")}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-white/70">
                                        {t("public.contactCtaDesc")}
                                    </p>
                                    {mainEmail && (
                                        <a
                                            href={`mailto:${mainEmail}`}
                                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-yambo-black shadow-sm transition-all hover:bg-yambo-green-50 active:scale-95"
                                        >
                                            <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />
                                            {t("public.contactCtaButton")}
                                        </a>
                                    )}
                                </div>
                            </div>
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
