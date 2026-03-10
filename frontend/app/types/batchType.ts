export interface BatchProgressMessage {
    batchId: string;
    current: number;
    total: number;
    item: string;
    success: boolean;
    errorMessage: string | null;
}

export interface BatchCompleteMessage {
    batchId: string;
    total: number;
    sent: number;
    failed: number;
    failures: Array<{ identifier: string; error: string }>;
}

export type BatchWsMessage = BatchProgressMessage | BatchCompleteMessage;

export function isBatchComplete(msg: BatchWsMessage): msg is BatchCompleteMessage {
    return "sent" in msg && "failures" in msg;
}
