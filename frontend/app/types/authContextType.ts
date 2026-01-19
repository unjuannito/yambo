import type { CurrentUser, Permission } from './userType';

export type RequiredPermission = {
    obj: string;
    action: string;
};

export interface AuthContextType {
    user: CurrentUser | null;
    loading: boolean;
    hasPermission: (required: RequiredPermission | RequiredPermission[], matchAll?: boolean) => boolean;
    login: (username: string, password: string) => Promise<void>;
    isAuthenticated: () => boolean;
    logout: () => void;
    reload: () => Promise<void>;
}
