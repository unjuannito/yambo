/**
 * JSON-LD structured data builders for public pages.
 *
 * Each function returns a plain object that can be serialised straight
 * into a <script type="application/ld+json"> tag via React Router v7's
 * `meta()` convention:  `{ "script:ld+json": organizationJsonLd(...) }`
 */

import type { ActiveProject, ProjectDetail, Monitor } from "~/services/publicService";
import type { Activity } from "~/types/activity";

/* ── Organisation ─────────────────────────────────────────────────── */

export function organizationJsonLd(siteUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "NGO",
        name: "Yambo",
        alternateName: "Yambo - Asociación Juvenil",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description:
            "Asociación juvenil en Alcobendas (Madrid) dedicada al ocio educativo, tiempo libre y actividades para niños y adolescentes.",
        address: {
            "@type": "PostalAddress",
            addressLocality: "Alcobendas",
            addressRegion: "Madrid",
            addressCountry: "ES",
        },
        sameAs: [] as string[], // filled at call-site if social links exist
    };
}

/* ── WebSite (for homepage) ──────────────────────────────────────── */

export function webSiteJsonLd(siteUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Yambo",
        url: siteUrl,
        inLanguage: "es",
    };
}

/* ── WebPage ─────────────────────────────────────────────────────── */

export function webPageJsonLd(opts: {
    name: string;
    description: string;
    url: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: opts.name,
        description: opts.description,
        url: opts.url,
        inLanguage: "es",
    };
}

/* ── CollectionPage ──────────────────────────────────────────────── */

export function collectionPageJsonLd(opts: {
    name: string;
    description: string;
    url: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: opts.name,
        description: opts.description,
        url: opts.url,
        inLanguage: "es",
    };
}

/* ── BreadcrumbList ──────────────────────────────────────────────── */

export function breadcrumbJsonLd(
    items: { name: string; url: string }[],
) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

/* ── Project (CreativeWork) ──────────────────────────────────────── */

export function projectJsonLd(project: ProjectDetail, siteUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: project.name,
        description: project.seo?.metaDescription ?? project.description ?? "",
        url: `${siteUrl}/proyectos/${project.id}`,
        ...(project.image ? { image: project.image } : {}),
        provider: {
            "@type": "NGO",
            name: "Yambo",
            url: siteUrl,
        },
        inLanguage: "es",
    };
}

/* ── ContactPage ─────────────────────────────────────────────────── */

export function contactPageJsonLd(opts: {
    siteUrl: string;
    email?: string;
    instagram?: string;
    tiktok?: string;
}) {
    const sameAs: string[] = [];
    if (opts.instagram) {
        sameAs.push(
            opts.instagram.startsWith("http")
                ? opts.instagram
                : `https://instagram.com/${opts.instagram.replace("@", "")}`,
        );
    }
    if (opts.tiktok) {
        sameAs.push(
            opts.tiktok.startsWith("http")
                ? opts.tiktok
                : `https://tiktok.com/@${opts.tiktok.replace("@", "")}`,
        );
    }

    return {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contacto - Yambo",
        url: `${opts.siteUrl}/contacto`,
        mainEntity: {
            "@type": "NGO",
            name: "Yambo",
            url: opts.siteUrl,
            ...(opts.email ? { email: opts.email } : {}),
            ...(sameAs.length > 0 ? { sameAs } : {}),
        },
        inLanguage: "es",
    };
}
