import { createContext, useState, useEffect, useCallback, type ReactNode, useContext } from 'react';
import { AuthService } from '~/services/authService';
import { UserService } from '~/services/userService';
import { ApiService } from '~/services/apiService';
import { Navigate } from 'react-router';
import toast from 'react-hot-toast';

import type { CurrentUser, Permission } from '~/types/userType';
import type { AuthContextType, RequiredPermission } from '~/types/authContextType';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authService = new AuthService();
const userService = new UserService();


export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const handleTokenExpired = useCallback(() => {
        console.log('Token expired, logging out user');
        setUser(null);
        // Redirect to login page
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }, []);

    useEffect(() => {
        // Set up global token expiration handler
        ApiService.setOnTokenExpired(handleTokenExpired);

        if (authService.isAuthenticated()) {
            reloadUser();
        } else {
            setLoading(false);
        }

        return () => {
            ApiService.setOnTokenExpired(null);
        };
    }, [handleTokenExpired]);


    const login = async (email: string, password: string) => {
        await authService.login(email, password);
        await reloadUser();
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        //TODO: redirigir a logout
    };

    const hasPermission = (required: RequiredPermission | RequiredPermission[], matchAll = true, showToast = false): boolean => {
        if (!user?.permissions) {
            if (showToast) {
                toast.error('No tienes permisos para realizar esta acción');
            }
            return false;
        }

        const hasPermissionObj = (perm: RequiredPermission): boolean => {
            return user.permissions.some(p => p.obj === perm.obj && p.actions.includes(perm.action));
        };

        const hasAccess = Array.isArray(required)
            ? (matchAll ? required.every(hasPermissionObj) : required.some(hasPermissionObj))
            : hasPermissionObj(required);

        if (!hasAccess && showToast) {
            toast.error('No tienes los permisos necesarios para realizar esta acción');
        }

        return hasAccess;
    }

    const reloadUser = async () => {
        try {
            const currentUser = await userService.getCurrentUser();
            setUser(currentUser);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const reload = async () => {
        setLoading(true);
        await reloadUser();
    };

    const isAuthenticated = (): boolean => authService.isAuthenticated();

    return (
        <AuthContext.Provider
            value={{ user, loading, login, logout, hasPermission, isAuthenticated, reload }}
        >
            {children}
        </AuthContext.Provider>
    );
};