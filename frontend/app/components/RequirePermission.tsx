import { useContext, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { AuthContext } from '~/context/AuthContext';
import type { RequiredPermission } from '~/types/authContextType';

export function RequirePermission({
    permission,
    children,
}: {
    permission: RequiredPermission;
    children: ReactNode;
}) {
    const context = useContext(AuthContext);
    if (!context) throw new Error('RequirePermission must be used within an AuthProvider');

    const { loading, hasPermission } = context;

    if (loading) return null; // o un spinner
    if (!hasPermission(permission)) return <Navigate to="/area-socios" replace />;
    return <>{children}</>;
}
