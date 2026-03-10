import { useEffect, useRef } from "react";
import { webSocketService } from "~/services/webSocketService";
import { useAuth } from "~/hooks/useAuth";
import { AuthService } from "~/services/authService";

const authService = new AuthService();

export function useWebSocket() {
    const { user } = useAuth();
    const connectedRef = useRef(false);

    useEffect(() => {
        if (user && !connectedRef.current) {
            const token = authService.getToken();
            if (token) {
                webSocketService.connect(token);
                connectedRef.current = true;
            }
        }

        if (!user && connectedRef.current) {
            webSocketService.disconnect();
            connectedRef.current = false;
        }

        return () => {
            if (connectedRef.current) {
                webSocketService.disconnect();
                connectedRef.current = false;
            }
        };
    }, [user]);

    return webSocketService;
}
