import { createContext, useState, useEffect, type ReactNode, useContext } from 'react';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';
import { Navigate } from 'react-router';

import type { CurrentUser, Permission } from '~/types/userType';
import type { AuthContextType } from '~/types/authContextType';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authService = new AuthService();
const userService = new UserService();


export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authService.isAuthenticated()) {
            reloadUser();
        } else {
            setLoading(false);
        }
    }, []);


    const login = async (email: string, password: string) => {
        await authService.login(email, password);
        await reloadUser();
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        //TODO: redirigir a logout
    };

    const hasPermission = (required: Permission | Permission[], matchAll = true): boolean => {
        if (!user?.permissions) return false;

        const hasPermissionObj = (perm: Permission): boolean => {
            return user.permissions.some(p => p.obj === perm.obj && perm.actions.every(a => p.actions.includes(a)));
        };

        if (Array.isArray(required)) {
            return matchAll
                ? required.every(hasPermissionObj)
                : required.some(hasPermissionObj);
        }

        return hasPermissionObj(required);
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

    const isAuthenticated = (): boolean => authService.isAuthenticated();

    return (
        <AuthContext.Provider
            value={{ user, loading, login, logout, hasPermission, isAuthenticated }}
        >
            {children}
        </AuthContext.Provider>
    );
};