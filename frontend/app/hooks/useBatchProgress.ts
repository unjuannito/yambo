import { useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { webSocketService } from "~/services/webSocketService";
import type { StompSubscription } from "@stomp/stompjs";
import type { BatchWsMessage } from "~/types/batchType";
import { isBatchComplete } from "~/types/batchType";

export function useBatchProgress() {
    const subscriptionRef = useRef<StompSubscription | null>(null);
    const toastIdRef = useRef<string | null>(null);

    const handleMessage = useCallback((msg: BatchWsMessage) => {
        if (isBatchComplete(msg)) {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
                toastIdRef.current = null;
            }

            if (msg.failed === 0) {
                toast.success(
                    `Lote completado: ${msg.sent}/${msg.total} procesados`,
                );
            } else {
                toast.error(
                    `Lote completado: ${msg.sent}/${msg.total} procesados, ${msg.failed} fallidos`,
                    { duration: 8000 },
                );
            }
        } else {
            const progressText = `Procesando ${msg.current}/${msg.total}...`;

            if (!msg.success && msg.errorMessage) {
                toast.error(
                    `Fallo en ${msg.item}: ${msg.errorMessage}`,
                    { duration: 6000 },
                );
            }

            if (toastIdRef.current) {
                toast.loading(progressText, { id: toastIdRef.current });
            } else {
                toastIdRef.current = toast.loading(progressText);
            }
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        webSocketService
            .subscribe("/user/queue/batch-progress", (stompMsg) => {
                if (!mounted) return;
                try {
                    const data = JSON.parse(stompMsg.body) as BatchWsMessage;
                    handleMessage(data);
                } catch {
                    // Ignore malformed messages
                }
            })
            .then((sub) => {
                if (mounted) {
                    subscriptionRef.current = sub;
                } else {
                    sub.unsubscribe();
                }
            });

        return () => {
            mounted = false;
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
                toastIdRef.current = null;
            }
        };
    }, [handleMessage]);
}
