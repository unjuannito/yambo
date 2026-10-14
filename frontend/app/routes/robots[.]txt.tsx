import { getSiteUrl, isSiteIndexable } from "~/utils/env.server";

/**
 * Resource route – returns a dynamic robots.txt.
 * No default export (no component) → React Router treats it as a resource route.
 */
export async function loader() {
    const siteUrl = getSiteUrl();

    // Fuera de producción no se bloquea el rastreo: así los buscadores llegan a ver el
    // `noindex` que root.tsx pone en cada página y sacan de su índice lo que ya tuvieran.
    const robotsTxt = isSiteIndexable()
        ? [
              "User-agent: *",
              "Allow: /",
              "",
              "# Private areas",
              "Disallow: /mi-espacio/",
              "Disallow: /api/",
              "Disallow: /login",
              "Disallow: /register",
              "Disallow: /forgot-password",
              "Disallow: /reset-password",
              "Disallow: /project-role-invitation/",
              "Disallow: /design-system",
              "",
              `Sitemap: ${siteUrl}/sitemap.xml`,
          ].join("\n")
        : ["User-agent: *", "Allow: /"].join("\n");

    return new Response(robotsTxt, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
    });
}
