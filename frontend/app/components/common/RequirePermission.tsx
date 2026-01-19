import { useContext, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { AuthContext } from '~/context/AuthContext';
import type { RequiredPermission } from '~/types/authContextType';

export function RequirePermission({
    permission,
    children,
    redirect = true,
    redirectTo = "/",
}: {
    permission: RequiredPermission;
    redirect?: boolean;
    redirectTo?: string;
    children: ReactNode;
}) {
    const context = useContext(AuthContext);
    if (!context) throw new Error('RequirePermission must be used within an AuthProvider');

    const { loading, hasPermission } = context;

    if (loading) return null; // o un spinner
    if(!hasPermission(permission)) {
        console.log('No tienes permiso para acceder a esta sección' + JSON.stringify(permission));
        if (redirect) {
            return <Navigate to={redirectTo} replace />;
        } else {
            return <></>;
        }
    }
    if (!hasPermission(permission)) return <Navigate to={redirectTo || "/"} replace />;
    return <>{children}</>;
}
