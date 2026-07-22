import { type ReactNode } from "react";
import { useAuth } from "~/hooks/useAuth";
import { canHaveExtraProfileData } from "~/utils/roleHelpers";

/**
 * Componente que solo muestra sus hijos si el usuario autenticado
 * tiene rol MONITOR o COORDINATOR (puede tener datos extra de perfil).
 *
 * Similar a RequirePermission pero basado en roles de grupo.
 */
export function RequireProfileRole({
    children,
    fallback = <></>,
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { user } = useAuth();

    if (!user || !canHaveExtraProfileData(user)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
