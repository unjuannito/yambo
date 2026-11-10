/**
 * Comprueba si un usuario es staff (miembro del equipo) y, por tanto, tiene
 * datos de staff (foto, bio, dato curioso).
 *
 * Es staff quien está añadido a mano o tiene un rol **de equipo** en algún
 * grupo. Desde issue #126 los roles son configurables y cada uno declara si es
 * de equipo (`isTeam`), así que ya no se decide por nombre de rol: el backend
 * marca `isTeam` en cada pertenencia y el frontend solo lo lee.
 */
export function isStaff(user: {
    staff?: unknown;
    groupRoles?: Array<{ role: string; isTeam?: boolean }>;
} | null | undefined): boolean {
    if (!user) return false;
    if (user.staff) return true;
    return user.groupRoles?.some((r) => r.isTeam) ?? false;
}
