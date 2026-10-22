/**
 * Comprueba si un usuario es staff (miembro del equipo) y, por tanto, tiene
 * datos de staff (foto, bio, dato curioso).
 *
 * Es staff quien está añadido a mano o tiene un rol de monitor o coordinador
 * en algún grupo. El backend solo devuelve `staff` mientras lo es.
 */
export function isStaff(user: {
    staff?: unknown;
    groupRoles?: Array<{ role: string }>;
} | null | undefined): boolean {
    if (!user) return false;
    if (user.staff) return true;
    return user.groupRoles?.some(
        (r) => r.role === "MONITOR" || r.role === "COORDINATOR"
    ) ?? false;
}

export type GroupRole = "MONITOR" | "COORDINATOR" | "PARENT";
