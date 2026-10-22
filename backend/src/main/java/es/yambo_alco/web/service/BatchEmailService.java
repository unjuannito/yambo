package es.yambo_alco.web.service;

import es.yambo_alco.web.dto.ws.BatchCompleteMessage;
import es.yambo_alco.web.model.NominativeInvitation;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.service.OrderService.PendingOrderEmail;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BatchEmailService {

    private static final Logger log = LoggerFactory.getLogger(BatchEmailService.class);

    private final NominativeInvitationService nominativeInvitationService;
    private final OrderService orderService;
    private final BatchProgressNotifier progressNotifier;

    @Async("mailExecutor")
    public void processBatchInvitations(String batchId, String username,
                                         List<NominativeInvitation> invitations) {
        int total = invitations.size();
        int sent = 0;
        int failed = 0;
        List<BatchCompleteMessage.FailureDetail> failures = new ArrayList<>();

        for (int i = 0; i < total; i++) {
            NominativeInvitation inv = invitations.get(i);
            String email = inv.getEmail();
            boolean success;
            String errorMessage = null;

            try {
                long hours = Duration.between(inv.getCreatedAt(), inv.getExpiresAt()).toHours();
                nominativeInvitationService.sendInvitationEmail(email, inv.getToken(), hours);
                success = true;
                sent++;
            } catch (Exception e) {
                success = false;
                failed++;
                errorMessage = e.getMessage();
                failures.add(new BatchCompleteMessage.FailureDetail(email, errorMessage));
                log.error("Batch [{}]: Failed to send email to {}", batchId, email, e);
            }

            progressNotifier.sendProgress(username, batchId, i + 1, total, email, success, errorMessage);
        }

        progressNotifier.sendComplete(username, batchId, total, sent, failed, failures);
        log.info("Batch [{}] complete: {}/{} sent, {} failed", batchId, sent, total, failed);
    }

    @Async("mailExecutor")
    public void processBatchOrderEmails(String batchId, String username,
                                         List<PendingOrderEmail> pendingEmails) {
        int total = pendingEmails.size();
        int sent = 0;
        int failed = 0;
        List<BatchCompleteMessage.FailureDetail> failures = new ArrayList<>();

        for (int i = 0; i < total; i++) {
            PendingOrderEmail pending = pendingEmails.get(i);
            String orderId = pending.orderId();
            boolean success;
            String errorMessage = null;

            try {
                Order order = orderService.getOrderById(orderId);
                orderService.sendOrderStatusUpdateEmail(order, pending.newStatus());
                success = true;
                sent++;
            } catch (Exception e) {
                success = false;
                failed++;
                errorMessage = e.getMessage();
                failures.add(new BatchCompleteMessage.FailureDetail(orderId, errorMessage));
                log.error("Batch [{}]: Failed to send order email for order {}", batchId, orderId, e);
            }

            progressNotifier.sendProgress(username, batchId, i + 1, total, orderId, success, errorMessage);
        }

        progressNotifier.sendComplete(username, batchId, total, sent, failed, failures);
        log.info("Batch [{}] order emails complete: {}/{} sent, {} failed", batchId, sent, total, failed);
    }
}
