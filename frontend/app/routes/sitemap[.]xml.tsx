import { getActiveProjects } from "~/services/publicService.server";
import { getPublicActivities } from "~/services/publicService.server";
import { getPublishedLegalPages } from "~/services/publicService.server";
import { getSiteUrl } from "~/utils/env.server";
import { isIndexableActivity } from "~/utils/seo";

/**
 * Resource route – returns a dynamic XML sitemap.
 * No default export (no component) → React Router treats it as a resource route.
 */
export async function loader() {
    const siteUrl = getSiteUrl();

    // ── Static public pages ─────────────────────────────────────────────
    // NOTE: paths must match the canonical URLs in each page's meta() export
    // (no trailing slashes) to avoid canonical conflicts with Google.
    const staticPages: { loc: string; changefreq: string; priority: string }[] = [
        { loc: "/",            changefreq: "weekly",  priority: "1.0" },
        { loc: "/proyectos",   changefreq: "weekly",  priority: "0.9" },
        { loc: "/actividades", changefreq: "weekly",  priority: "0.8" },
        { loc: "/equipo",      changefreq: "monthly", priority: "0.7" },
        { loc: "/contacto",    changefreq: "monthly", priority: "0.5" },
    ];

    // ── Dynamic legal pages ────────────────────────────────────────────
    let legalEntries: string[] = [];
    try {
        const legalPages = await getPublishedLegalPages();
        legalEntries = legalPages.map(
            (p) => `
  <url>
    <loc>${escapeXml(siteUrl)}/legal/${escapeXml(p.id)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`,
        );
    } catch {
        // Backend unreachable → skip legal entries
    }

    // ── Dynamic project pages ───────────────────────────────────────────
    let projectEntries: string[] = [];
    try {
        const projects = await getActiveProjects();
        projectEntries = projects.map(
            (p) => `
  <url>
    <loc>${escapeXml(siteUrl)}/proyectos/${escapeXml(p.id)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
        );
    } catch {
        // If the backend is unreachable we still serve the static pages
    }

    // ── Dynamic activity pages ──────────────────────────────────────────
    let activityEntries: string[] = [];
    try {
        const activities = await getPublicActivities();
        // Solo las que la propia página deja indexar; las pasadas y canceladas llevan noindex
        activityEntries = activities.filter((a) => isIndexableActivity(a)).map(
            (a) => `
  <url>
    <loc>${escapeXml(siteUrl)}/actividades/${escapeXml(a.id)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`,
        );
    } catch {
        // Backend unreachable → skip activity entries
    }

    // ── Build XML ───────────────────────────────────────────────────────
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
    .map(
        (p) => `  <url>
    <loc>${escapeXml(siteUrl)}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    )
    .join("\n")}
${legalEntries.join("\n")}
${projectEntries.join("\n")}
${activityEntries.join("\n")}
</urlset>`;

    return new Response(xml.trim(), {
        status: 200,
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "X-Robots-Tag": "noindex",
        },
    });
}

/** Minimal XML entity escaping for URLs */
function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
