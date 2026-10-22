import {
    createContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { AuthService } from "~/services/authService";
import { UserService } from "~/services/userService";
import { ApiService } from "~/services/apiService";
import toast from "react-hot-toast";

import type { CurrentUser, Permission } from "~/types/userType";
import type {
    AuthContextType,
    RequiredPermission,
} from "~/types/authContextType";

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);
const authService = new AuthService();
const userService = new UserService();

function getTokenExpiration(token: string): number | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(
                    (c) =>
                        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
                )
                .join(""),
        );
        const payload = JSON.parse(jsonPayload);
        return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const tokenRenewalTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleTokenExpired = useCallback(() => {
        console.log("Token expired, logging out user");
        setUser(null);
        toast.error(
            "¡Tu sesión ha caducado! Vuelve a iniciar sesión",
        );
        if (typeof window !== "undefined") {
            window.location.href = "/";
        }
    }, []);

    const setupTokenRenewal = useCallback(() => {
        if (tokenRenewalTimerRef.current) {
            clearInterval(tokenRenewalTimerRef.current);
        }

        const token = authService.getToken();
        if (!token) {
            return;
        }

        const expirationTime = getTokenExpiration(token);
        if (!expirationTime) {
            return;
        }

        tokenRenewalTimerRef.current = setInterval(async () => {
            const currentToken = authService.getToken();
            if (!currentToken) {
                if (tokenRenewalTimerRef.current) {
                    clearInterval(tokenRenewalTimerRef.current);
                }
                return;
            }

            const expTime = getTokenExpiration(currentToken);
            if (!expTime) {
                return;
            }

            const now = Date.now();
            const timeUntilExpiration = expTime - now;

            // Renew token if it expires in less than 10 minutes (600000ms)
            if (timeUntilExpiration < 600000 && timeUntilExpiration > 0) {
                try {
                    console.log("Token about to expire, refreshing...");
                    await authService.reload();
                    console.log("Token refreshed successfully");
                    setupTokenRenewal();
                } catch (error) {
                    console.error("Failed to refresh token:", error);
                }
            }
        }, 300000); // Check every 5 minutes
    }, []);

    useEffect(() => {
        ApiService.setOnTokenExpired(handleTokenExpired);

        if (authService.isAuthenticated()) {
            reloadUser();
            setupTokenRenewal();
        } else {
            setLoading(false);
        }

        return () => {
            ApiService.setOnTokenExpired(null);
            if (tokenRenewalTimerRef.current) {
                clearInterval(tokenRenewalTimerRef.current);
            }
        };
    }, [handleTokenExpired, setupTokenRenewal]);

    const login = async (email: string, password: string) => {
        await authService.login(email, password);
        await reloadUser();
        setupTokenRenewal();
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        if (tokenRenewalTimerRef.current) {
            clearInterval(tokenRenewalTimerRef.current);
        }
        //TODO: redirigir a logout
    };

    const hasPermission = (
        required: RequiredPermission | RequiredPermission[],
        matchAll = true,
        showToast = false,
    ): boolean => {
        if (!user?.permissions) {
            if (showToast) {
                toast.error("¡Acceso denegado! No tienes permisos para esto");
            }
            return false;
        }

        const hasPermissionObj = (perm: RequiredPermission): boolean => {
            return user.permissions.some(
                (p) => p.obj === perm.obj && p.actions.includes(perm.action),
            );
        };

        const hasAccess = Array.isArray(required)
            ? matchAll
                ? required.every(hasPermissionObj)
                : required.some(hasPermissionObj)
            : hasPermissionObj(required);

        if (!hasAccess && showToast) {
            toast.error(
                "¡Acceso denegado! Te faltan permisos para esta acción",
            );
        }

        return hasAccess;
    };

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
        setupTokenRenewal();
    };

    const isAuthenticated = (): boolean => authService.isAuthenticated();

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                hasPermission,
                isAuthenticated,
                reload,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
