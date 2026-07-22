/**
 * Comprueba si un usuario puede tener datos extra de perfil
 * (bio, funFact, foto extendida) según sus roles en grupos.
 *
 * Solo monitores y coordinadores pueden tener estos campos.
 */
export function canHaveExtraProfileData(user: {
    groupRoles?: Array<{ role: string }>;
}): boolean {
    return user.groupRoles?.some(
        (r) => r.role === "MONITOR" || r.role === "COORDINATOR"
    ) ?? false;
}

export type GroupRole = "MONITOR" | "COORDINATOR" | "PARENT";
