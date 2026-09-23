/**
 * Genera un identificador único.
 *
 * `crypto.randomUUID()` solo existe en contextos seguros (HTTPS / localhost).
 * En entornos no seguros (p. ej. http://192.168.x.x o Firefox con protección
 * de huella digital) la función no está disponible y lanzaría un TypeError.
 * Por eso se usa un fallback simple cuando no existe.
 */
export function randomId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}
