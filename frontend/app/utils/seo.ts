/**
 * Meta tags comunes de las páginas públicas: título, descripción, canonical,
 * Open Graph y Twitter. Cada ruta añade después su JSON-LD.
 */

import type { MetaDescriptor } from "react-router";
import type { Activity } from "~/types/activity";
import { stripMarkdown } from "~/utils/activity-helpers";

const SITE_NAME = "Yambo";
const DESCRIPTION_MAX = 160;

/** Los buscadores y las redes necesitan URLs completas; las subidas se guardan como `/uploads/...`. */
export function absoluteUrl(siteUrl: string, path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Texto plano de una sola línea, cortado por palabra, apto para `meta description`. */
export function metaDescription(text: string, max = DESCRIPTION_MAX): string {
    const plain = stripMarkdown(text).replace(/\s+/g, " ").trim();
    if (plain.length <= max) return plain;
    const cut = plain.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, "")}…`;
}

/**
 * Una actividad se indexa mientras está por venir: ni cancelada ni pasada.
 * Lo comparten la página de detalle (robots), el sitemap y los listados.
 */
export function isIndexableActivity(activity: Pick<Activity, "date" | "status">, now = new Date()): boolean {
    if (activity.status?.value === "CANCELLED" || !activity.date) return false;
    return new Date(activity.date) >= now;
}

export interface PageMeta {
    siteUrl: string;
    /** Ruta canónica de la página, sin barra final (`""` para la portada). */
    path: string;
    title: string;
    description: string;
    /** Imagen para compartir; por defecto el logo. Admite rutas relativas. */
    image?: string | null;
    type?: "website" | "article" | "profile";
    index?: boolean;
}

export function buildMeta({ siteUrl, path, title, description, image, type = "website", index = true }: PageMeta): MetaDescriptor[] {
    const url = absoluteUrl(siteUrl, path).replace(/\/$/, "") || siteUrl;
    const imageUrl = absoluteUrl(siteUrl, image || "/logo.png");
    // Solo una imagen propia merece la tarjeta grande; el logo se vería recortado
    const card = image ? "summary_large_image" : "summary";

    return [
        { title },
        { name: "description", content: description },
        { tagName: "link", rel: "canonical", href: url },
        { name: "robots", content: index ? "index, follow" : "noindex, follow" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:locale", content: "es_ES" },
        { property: "og:type", content: type },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: imageUrl },
        { name: "twitter:card", content: card },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
    ];
}
