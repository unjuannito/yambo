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
    // FRONTEND_URL must be set at runtime (docker-compose / k8s env var).
    // The fallback below only activates when neither env var nor runtime config is provided.
    const raw = process.env.FRONTEND_URL || "http://localhost";
    return raw.replace(/\/+$/, ""); // strip trailing slashes
}
