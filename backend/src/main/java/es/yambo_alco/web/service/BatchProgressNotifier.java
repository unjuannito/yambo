package es.yambo_alco.web.service;

import es.yambo_alco.web.dto.ws.BatchCompleteMessage;
import es.yambo_alco.web.dto.ws.BatchProgressMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BatchProgressNotifier {

    private static final String QUEUE = "/queue/batch-progress";

    private final SimpMessagingTemplate messagingTemplate;

    public void sendProgress(String username, String batchId, int current, int total,
                             String item, boolean success, String errorMessage) {
        if (username == null) return;
        BatchProgressMessage progress = new BatchProgressMessage(
                batchId, current, total, item, success, errorMessage);
        messagingTemplate.convertAndSendToUser(username, QUEUE, progress);
    }

    public void sendComplete(String username, String batchId, int total, int sent,
                             int failed, List<BatchCompleteMessage.FailureDetail> failures) {
        if (username == null) return;
        BatchCompleteMessage complete = new BatchCompleteMessage(
                batchId, total, sent, failed, failures);
        messagingTemplate.convertAndSendToUser(username, QUEUE, complete);
    }
}
