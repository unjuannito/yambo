import { getSiteUrl } from "~/utils/env.server";

/**
 * Resource route – returns a dynamic robots.txt.
 * No default export (no component) → React Router treats it as a resource route.
 */
export async function loader() {
    const siteUrl = getSiteUrl();

    const robotsTxt = [
        "User-agent: *",
        "Allow: /",
        "",
        "# Private areas",
        "Disallow: /mi-espacio/",
        "Disallow: /login",
        "Disallow: /register",
        "",
        `Sitemap: ${siteUrl}/sitemap.xml`,
    ].join("\n");

    return new Response(robotsTxt, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
    });
}
