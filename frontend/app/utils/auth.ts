/**
 * Validates a returnTo value is a safe relative path (prevents open-redirect attacks).
 * Only allows paths starting with a single "/" (rejects "//evil.com", "https://evil.com", etc.).
 */
export function getSafeReturnTo(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.startsWith("/") && !value.startsWith("//")) return value;
    return null;
}

/**
 * Builds a login URL with an optional returnTo parameter.
 */
export function getLoginUrl(returnTo?: string): string {
    const safe = getSafeReturnTo(returnTo);
    if (!safe) return "/login";
    return `/login?returnTo=${encodeURIComponent(safe)}`;
}
