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
            String productName, String orderId, String createdBy, LocalDateTime createdAt);

    void sendIssueCommentAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String commentAuthor, String commentText, LocalDateTime commentDate,
            IssueStatus oldStatus, IssueStatus newStatus);

    void sendIssueStatusChanged(String to, String userName, String issueId, String issueTitle,
            String productName, IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt);

    /**
     * Generates a payment reference in the format: merch-{year}-{orderId}
     * This matches the frontend payment reference format.
     *
     * @param orderDate The order date (year will be extracted)
     * @param orderId   The order ID
     * @return The formatted payment reference
     */
    default String generatePaymentReference(LocalDateTime orderDate, String orderId) {
        return "merch-" + orderDate.getYear() + "-" + orderId;
    }

    class OrderProductInfo {
        private final String name;
        private final Integer quantity;
        private final BigDecimal price;
        private final String configuration;

        public OrderProductInfo(String name, Integer quantity, BigDecimal price, String configuration) {
            this.name = name;
            this.quantity = quantity;
            this.price = price;
            this.configuration = configuration;
        }

        public String getName() {
            return name;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public String getConfiguration() {
            return configuration;
        }
    }
}
