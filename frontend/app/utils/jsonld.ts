/**
 * JSON-LD structured data builders for public pages.
 *
 * Each function returns a plain object that can be serialised straight
 * into a <script type="application/ld+json"> tag via React Router v7's
 * `meta()` convention:  `{ "script:ld+json": organizationJsonLd(...) }`
 */

import type { ProjectDetail, StaffMember } from "~/services/publicService";
import type { Activity } from "~/types/activity";
import { stripMarkdown } from "~/utils/activity-helpers";
import { absoluteUrl } from "~/utils/seo";

/**
 * Las fechas llegan como hora local de Madrid sin zona («2026-12-20T10:00:00»);
 * los buscadores necesitan el desfase para no moverlas de hora.
 */
export function withMadridOffset(localDateTime: string): string {
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(localDateTime)) return localDateTime;
    const asUtc = new Date(`${localDateTime}Z`);
    if (Number.isNaN(asUtc.getTime())) return localDateTime;
    const zone = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", timeZoneName: "longOffset" })
        .formatToParts(asUtc)
        .find((part) => part.type === "timeZoneName")?.value;
    const offset = zone?.replace("GMT", "") || "+00:00";
    return `${localDateTime}${offset}`;
}

/* ── Organisation ─────────────────────────────────────────────────── */

export function organizationJsonLd(siteUrl: string, socialLinks?: { instagram?: string; tiktok?: string }) {
    const sameAs: string[] = [];
    if (socialLinks?.instagram) {
        sameAs.push(
            socialLinks.instagram.startsWith("http")
                ? socialLinks.instagram
                : `https://instagram.com/${socialLinks.instagram.replace("@", "")}`,
        );
    }
    if (socialLinks?.tiktok) {
        sameAs.push(
            socialLinks.tiktok.startsWith("http")
                ? socialLinks.tiktok
                : `https://tiktok.com/@${socialLinks.tiktok.replace("@", "")}`,
        );
    }

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
        ...(sameAs.length > 0 ? { sameAs } : {}),
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

/* ── ItemList (listados) ─────────────────────────────────────────── */

export function itemListJsonLd(items: { name: string; url: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            url: item.url,
        })),
    };
}

/* ── Equipo (miembros de la asociación) ──────────────────────────── */

/**
 * El equipo como miembros de la asociación. Las personas no llevan URL propia:
 * no tienen página individual y no se busca posicionarlas por su nombre.
 */
export function teamJsonLd(staff: StaffMember[], siteUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "NGO",
        name: "Yambo",
        url: siteUrl,
        member: staff.map((person) => {
            const coordinates = person.groups.some((g) => g.role === "COORDINATOR");
            const projects = [...new Set(person.groups.map((g) => g.projectName))];
            return {
                "@type": "Person",
                name: person.nickname || person.name,
                jobTitle: coordinates ? "Coordinador" : "Monitor",
                ...(person.bio ? { description: person.bio } : {}),
                // El backend solo envía la foto de quien dio su consentimiento
                ...(person.photo ? { image: absoluteUrl(siteUrl, person.photo) } : {}),
                ...(projects.length > 0 ? { knowsAbout: projects } : {}),
            };
        }),
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
        ...(project.image ? { image: absoluteUrl(siteUrl, project.image) } : {}),
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

/* ── Activity (Event) ────────────────────────────────────────────── */

const STATUS_TO_SCHEMA: Record<string, string> = {
    PLANNED: "EventScheduled",
    OPEN_REGISTRATION: "EventScheduled",
    REGISTRATION_CLOSED: "EventScheduled",
    CLOSED: "EventCompleted",
    CANCELLED: "EventCancelled",
};

export function activityJsonLd(
    activity: Activity,
    siteUrl: string,
) {
    const now = new Date();
    const activityDate = activity.date ? new Date(activity.date) : null;
    const isPast = activityDate ? activityDate < now : false;
    const eventStatus = STATUS_TO_SCHEMA[activity.status?.value ?? "PLANNED"] ?? "EventScheduled";

    return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: activity.name,
        description: activity.description ? stripMarkdown(activity.description) : "",
        url: `${siteUrl}/actividades/${activity.id}`,
        ...(activity.date ? { startDate: withMadridOffset(activity.date) } : {}),
        ...(activity.endDate ? { endDate: withMadridOffset(activity.endDate) } : {}),
        eventStatus: `https://schema.org/${eventStatus}`,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        ...(activity.location
            ? {
                  location: {
                      "@type": "Place",
                      name: activity.location,
                      address: {
                          "@type": "PostalAddress",
                          addressLocality: "Alcobendas",
                          addressRegion: "Madrid",
                          addressCountry: "ES",
                      },
                  },
              }
            : {}),
        ...(activity.price != null
            ? {
                  offers: {
                      "@type": "Offer",
                      price: activity.price,
                      priceCurrency: "EUR",
                      url: `${siteUrl}/actividades/${activity.id}`,
                      availability: isPast
                          ? "https://schema.org/SoldOut"
                          : "https://schema.org/InStock",
                  },
              }
            : {}),
        ...(activity.image ? { image: absoluteUrl(siteUrl, activity.image) } : {}),
        organizer: {
            "@type": "NGO",
            name: "Yambo",
            url: siteUrl,
        },
        inLanguage: "es",
    };
}
