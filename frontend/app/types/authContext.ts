import type { User } from './user';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasPermission: (permission: string) => boolean;
    login: (email: string, password: string) => Promise<void>;
    isAuthenticated: () => boolean;
    logout: () => void;
}
