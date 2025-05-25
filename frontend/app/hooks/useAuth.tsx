import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AuthService } from '../services/auth';
import { UserService } from '../services/user';
import type { User } from '~/types/user';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasPermission: (permission: string) => boolean;    
    login: (username: string, password: string) => Promise<void>;
    isAuthenticated: () => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const authService = new AuthService();
    const userService = new UserService();

    const reloadUser = async () => {
        try {
            const current = await userService.getCurrentUser();
            setUser(current);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

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
    };

    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        return user.permissions.includes(permission);
    };

    const isAuthenticated = (): boolean => {
        return authService.isAuthenticated();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
