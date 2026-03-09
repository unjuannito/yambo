package es.yambo_alco.web.service;

import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface MailService {

    void sendInvitation(String to, String subject, String body);

    void sendOrderStatusUpdate(String to, String userName, String orderId,
            LocalDateTime orderDate, OrderStatus newStatus,
            List<OrderProductInfo> products, BigDecimal totalPrice);

    void sendOrderCanceled(String to, String userName, String orderId,
            LocalDateTime orderDate, List<OrderProductInfo> products,
            BigDecimal totalPrice, boolean canceledByAdmin);

    void sendIssueCreated(String to, String userName, String issueId, String issueTitle,
            String productName, String orderId, String createdBy, LocalDateTime createdAt,
            String description);

    void sendIssueCommentAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String commentAuthor, String commentText, LocalDateTime commentDate,
            IssueStatus oldStatus, IssueStatus newStatus);

    void sendIssueStatusChanged(String to, String userName, String issueId, String issueTitle,
            String productName, IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt);

    void sendPasswordResetEmail(String to, String resetLink, long expirationHours);

    default String generatePaymentReference(LocalDateTime orderDate, String orderId) {
        return "merch " + orderDate.getYear() + " " + orderId;
    }

    record OrderProductInfo(String name, Integer quantity, BigDecimal price, String configuration) {
    }
}
