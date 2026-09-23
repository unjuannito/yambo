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

    void sendIssueWatcherAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String threadMarkdown, LocalDateTime sentAt);

    void sendPasswordResetEmail(String to, String resetLink, long expirationHours);

    void sendActivityOpenRegistration(String to, String activityName, String activityUrl);

    /**
     * Notifica al socio que un administrador ha creado o modificado su pedido.
     *
     * @param action "creado" o "modificado"
     */
    void sendOrderAdminUpdate(String to, String userName, String orderId, LocalDateTime orderDate,
            String action, List<OrderProductInfo> products, BigDecimal totalPrice, String justification,
            String issueId, List<OrderProductRow> rows, BigDecimal oldTotalPrice, OrderStatus currentStatus);

    default String generatePaymentReference(LocalDateTime orderDate, String orderId) {
        return "merch " + orderDate.getYear() + " " + orderId;
    }

    record OrderProductInfo(String name, Integer quantity, BigDecimal price, String configuration) {
    }

    /**
     * Un único valor de opción del producto (p. ej. "Talla") con su valor
     * anterior y nuevo ya formateados.
     * {@code kind}: added / removed / changed / unchanged.
     */
    record OrderProductOptionChange(String kind, String label, String oldText, String newText) {
    }

    /**
     * Fila del pedido para el correo de administración, con el desglose de
     * cambios por valor (cantidad, opciones y precio) en lugar de la fila entera.
     * {@code type}: added / removed / modified / unchanged.
     */
    record OrderProductRow(
            String type,
            String name,
            Integer oldQuantity,
            Integer newQuantity,
            boolean quantityChanged,
            List<OrderProductOptionChange> options,
            String oldPriceText,
            String newPriceText,
            boolean priceChanged) {
    }
}
