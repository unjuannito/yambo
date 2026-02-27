/**
 * Server-only environment helpers.
 * The `.server.ts` suffix prevents this from being bundled into the client.
 */

/**
 * Returns the public-facing base URL of the site (no trailing slash).
 * Reads FRONTEND_URL at runtime so every SSR request picks up the
 * current value without a rebuild.
 */
export function getSiteUrl(): string {
    const raw = process.env.FRONTEND_URL || "https://yambo.cabrasky.net";
    return raw.replace(/\/+$/, ""); // strip trailing slashes
}
