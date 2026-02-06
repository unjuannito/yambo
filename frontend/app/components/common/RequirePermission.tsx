import { useContext, useEffect, useRef, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { AuthContext } from '~/context/AuthContext';
import type { RequiredPermission } from '~/types/authContextType';
import toast from 'react-hot-toast';

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
    const toastShown = useRef(false);

    useEffect(() => {
        if (!loading && !hasPermission(permission) && !toastShown.current) {
            toastShown.current = true;
            toast.error('No tienes permiso para acceder a esta sección');
        }
    }, [loading, hasPermission, permission]);

    if (loading) return null;
    
    if (!hasPermission(permission)) {
        if (redirect) {
            return <Navigate to={redirectTo} replace />;
        } else {
            return <></>;
        }
    }
    
    return <>{children}</>;
}
