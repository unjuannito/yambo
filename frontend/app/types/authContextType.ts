import type { CurrentUser, Permission } from './userType';

export interface AuthContextType {
    user: CurrentUser | null;
    loading: boolean;
    hasPermission: (required: Permission | Permission[], matchAll?: boolean) => boolean;
    login: (username: string, password: string) => Promise<void>;
    isAuthenticated: () => boolean;
    logout: () => void;
}
