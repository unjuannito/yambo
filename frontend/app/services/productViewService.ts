import { ApiService } from "./apiService";

const SESSION_KEY = "yambo_session_id";

function getSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
}

class ProductViewServiceClass extends ApiService {
    public async trackView(productId: string): Promise<void> {
        try {
            const sessionId = getSessionId();
            await this.post(`/products/${encodeURIComponent(productId)}/views`, {
                sessionId,
            });
        } catch {
            // Fire-and-forget: silently ignore tracking failures
        }
    }
}

export const productViewService = new ProductViewServiceClass();
