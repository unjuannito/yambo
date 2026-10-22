import { Client } from "@stomp/stompjs";
import type { IMessage, StompSubscription } from "@stomp/stompjs";

class WebSocketService {
    private client: Client | null = null;
    private token: string | null = null;
    private pendingSubscriptions: Array<{
        destination: string;
        callback: (msg: IMessage) => void;
        resolve: (sub: StompSubscription) => void;
    }> = [];

    connect(token: string): void {
        if (this.client?.connected) {
            return;
        }

        this.token = token;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/ws/websocket`;

        this.client = new Client({
            brokerURL: wsUrl,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            onConnect: () => {
                // Process any subscriptions that were queued before connection
                for (const pending of this.pendingSubscriptions) {
                    if (this.client?.connected) {
                        const sub = this.client.subscribe(
                            pending.destination,
                            pending.callback,
                        );
                        pending.resolve(sub);
                    }
                }
                this.pendingSubscriptions = [];
            },
            onStompError: (frame) => {
                console.error("STOMP error:", frame.headers["message"]);
            },
        });

        this.client.activate();
    }

    disconnect(): void {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }
        this.token = null;
        this.pendingSubscriptions = [];
    }

    subscribe(
        destination: string,
        callback: (msg: IMessage) => void,
    ): Promise<StompSubscription> {
        return new Promise((resolve) => {
            if (this.client?.connected) {
                const sub = this.client.subscribe(destination, callback);
                resolve(sub);
            } else {
                this.pendingSubscriptions.push({
                    destination,
                    callback,
                    resolve,
                });
            }
        });
    }

    isConnected(): boolean {
        return this.client?.connected ?? false;
    }
}

export const webSocketService = new WebSocketService();
