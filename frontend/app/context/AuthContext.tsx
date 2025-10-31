import { createContext, useState, useEffect, type ReactNode, useContext } from 'react';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';
import { Navigate } from 'react-router';

import type { User } from '~/types/userType';
import type { AuthContextType } from '~/types/authContextType';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authService = new AuthService();
const userService = new UserService();


export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authService.isAuthenticated()) {
            reloadUser();
        } else {
            setLoading(false);
        }
    }, []);


    const login = async (username: string, password: string) => {
        await authService.login(username, password);
        await reloadUser();
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        //TODO redirigir a logout
    };

    const hasPermission = (required: string | string[], matchAll = true): boolean => {
        if (!user?.permissions) return false;

        const permissions = user.permissions.map(p => p.toLowerCase());

        if (Array.isArray(required)) {
            return matchAll
                ? required.every(r => permissions.includes(r.toLowerCase()))
                : required.some(r => permissions.includes(r.toLowerCase()));
        }

        return permissions.includes(required.toLowerCase());
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