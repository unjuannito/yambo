package es.yambo_alco.web.service;

import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Primary
@ConditionalOnBean(JavaMailSender.class)
@RequiredArgsConstructor
public class HtmlMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(HtmlMailService.class);

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final SettingsService settingsService;

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    @Override
    public void sendInvitation(String to, String subject, String body) {
        try {
            // Get from email and name from database settings
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject(subject);

            String invitationLink = extractInvitationLink(body);

            // Create context with variables for the template
            Context context = new Context();
            context.setVariable("invitationLink", invitationLink);
            context.setVariable("expirationHours", expirationHours);

            String htmlContent = templateEngine.process("emails/invitation", context);

            helper.setText(body, htmlContent);

            mailSender.send(message);
            log.info("Invitation email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send invitation email to: {}", to, e);
            throw new RuntimeException("Failed to send invitation email", e);
        } catch (Exception e) {
            log.error("Unexpected error sending email to: {}", to, e);
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    private String extractInvitationLink(String body) {
        if (body == null) {
            return "";
        }

        String[] words = body.split("\\s+");
        for (String word : words) {
            if (word.startsWith("http://") || word.startsWith("https://")) {
                return word;
            }
        }

        return "";
    }

    @Override
    public void sendOrderStatusUpdate(String to, String userName, String orderId,
            LocalDateTime orderDate, OrderStatus newStatus,
            List<OrderProductInfo> products, BigDecimal totalPrice) {
        try {
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);

            String subject = getSubjectForStatus(newStatus);
            String template = getTemplateForStatus(newStatus);

            helper.setSubject(subject);

            Context context = new Context();
            context.setVariable("userName", userName);
            context.setVariable("orderId", orderId);
            context.setVariable("orderDate", orderDate);
            context.setVariable("products", products);
            context.setVariable("totalPrice", totalPrice);
            context.setVariable("year", orderDate.getYear());

            context.setVariable("iban", settingsService.getIban());
            context.setVariable("legalName", settingsService.getOrganizationLegalName());
            context.setVariable("paymentReference", generatePaymentReference(orderDate, orderId));

            String htmlContent = templateEngine.process(template, context);

            String plainText = createPlainTextOrderNotification(userName, orderId, orderDate, newStatus, products,
                    totalPrice);

            helper.setText(plainText, htmlContent);

            mailSender.send(message);
            log.info("Order status update email sent successfully to: {} for order: {}", to, orderId);
        } catch (MessagingException e) {
            log.error("Failed to send order status update email to: {} for order: {}", to, orderId, e);
            throw new RuntimeException("Failed to send order status update email", e);
        } catch (Exception e) {
            log.error("Unexpected error sending order status update email to: {} for order: {}", to, orderId, e);
            throw new RuntimeException("Failed to send order status update email", e);
        }
    }

    private String getSubjectForStatus(OrderStatus status) {
        return switch (status) {
            case PENDING_CONFIRMATION -> "Pedido Pendiente de Pago - Yambo";
            case CONFIRMED -> "Pedido Confirmado - Yambo";
            case IN_PROGRESS -> "Pedido en Preparación - Yambo";
            case DELIVERED -> "Pedido Entregado - Yambo";
            case CANCELLED -> "Pedido Cancelado - Yambo";
        };
    }

    private String getTemplateForStatus(OrderStatus status) {
        return switch (status) {
            case PENDING_CONFIRMATION -> "emails/order-pending-payment";
            case CONFIRMED -> "emails/order-confirmed";
            case IN_PROGRESS -> "emails/order-in-progress";
            case DELIVERED -> "emails/order-delivered";
            case CANCELLED -> "emails/order-cancelled";
        };
    }

    private String createPlainTextOrderNotification(String userName, String orderId,
            LocalDateTime orderDate, OrderStatus status,
            List<OrderProductInfo> products, BigDecimal totalPrice) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");

        if (status == OrderStatus.PENDING_CONFIRMATION) {
            sb.append("Hemos recibido tu pedido. Para completar el proceso, realiza el pago.\n\n");
        } else {
            sb.append("Tu pedido ha sido actualizado.\n\n");
        }

        sb.append("Detalles del Pedido:\n");
        sb.append("ID: ").append(orderId).append("\n");
        sb.append("Estado: ").append(getStatusText(status)).append("\n");
        sb.append("Fecha: ").append(orderDate).append("\n\n");
        sb.append("Productos:\n");
        for (OrderProductInfo product : products) {
            sb.append("- ").append(product.getName())
                    .append(" x").append(product.getQuantity())
                    .append(" - ").append(product.getPrice()).append(" €");
            if (product.getConfiguration() != null && !product.getConfiguration().isEmpty()) {
                sb.append(" (").append(product.getConfiguration()).append(")");
            }
            sb.append("\n");
        }
        sb.append("\nTotal: ").append(totalPrice).append(" €\n");

        if (status == OrderStatus.PENDING_CONFIRMATION) {
            String iban = settingsService.getIban();
            String legalName = settingsService.getOrganizationLegalName();
            String paymentReference = generatePaymentReference(orderDate, orderId);

            sb.append("\nInstrucciones de Pago:\n");
            sb.append("Beneficiario: ").append(legalName).append("\n");
            sb.append("IBAN: ").append(iban).append("\n");
            sb.append("Concepto: ").append(paymentReference).append("\n");
            sb.append("Importe: ").append(totalPrice).append(" €\n");
        }

        sb.append("\n¡Gracias por tu compra!\n");
        return sb.toString();
    }

    private String getStatusText(OrderStatus status) {
        return switch (status) {
            case PENDING_CONFIRMATION -> "PENDIENTE DE CONFIRMACIÓN";
            case CONFIRMED -> "CONFIRMADO";
            case IN_PROGRESS -> "EN PREPARACIÓN";
            case DELIVERED -> "ENTREGADO";
            case CANCELLED -> "CANCELADO";
        };
    }

    @Override
    public void sendIssueCreated(String to, String userName, String issueId, String issueTitle,
            String productName, String orderId, String createdBy, LocalDateTime createdAt) {
        try {
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject("Nueva Incidencia Reportada - Yambo");

            Context context = new Context();
            context.setVariable("userName", userName);
            context.setVariable("issueId", issueId);
            context.setVariable("issueTitle", issueTitle);
            context.setVariable("productName", productName);
            context.setVariable("orderId", orderId);
            context.setVariable("createdBy", createdBy);
            context.setVariable("createdAt", createdAt);
            context.setVariable("issueLink", buildIssueLink(issueId));

            String htmlContent = templateEngine.process("emails/issue-created", context);
            String plainText = createPlainTextIssueCreated(userName, issueId, issueTitle, productName, orderId,
                    createdBy, createdAt);

            helper.setText(plainText, htmlContent);
            mailSender.send(message);
            log.info("Issue created email sent successfully to: {} for issue: {}", to, issueId);
        } catch (Exception e) {
            log.error("Failed to send issue created email to: {} for issue: {}", to, issueId, e);
            throw new RuntimeException("Failed to send issue created email", e);
        }
    }

    @Override
    public void sendIssueCommentAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String commentAuthor, String commentText, LocalDateTime commentDate,
            IssueStatus oldStatus, IssueStatus newStatus) {
        try {
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject("Nuevo Comentario en Incidencia - Yambo");

            Context context = new Context();
            context.setVariable("userName", userName);
            context.setVariable("issueId", issueId);
            context.setVariable("issueTitle", issueTitle);
            context.setVariable("productName", productName);
            context.setVariable("commentAuthor", commentAuthor);
            context.setVariable("commentText", commentText);
            context.setVariable("commentDate", commentDate);
            context.setVariable("statusChanged", oldStatus != null && newStatus != null && oldStatus != newStatus);
            context.setVariable("oldStatusText", oldStatus != null ? getIssueStatusText(oldStatus) : null);
            context.setVariable("newStatusText", newStatus != null ? getIssueStatusText(newStatus) : null);
            context.setVariable("statusColor", newStatus != null ? getIssueStatusColor(newStatus) : "#3498db");
            context.setVariable("issueLink", buildIssueLink(issueId));

            String htmlContent = templateEngine.process("emails/issue-comment-added", context);
            String plainText = createPlainTextCommentAdded(userName, issueId, issueTitle, commentAuthor, commentText,
                    commentDate, oldStatus, newStatus);

            helper.setText(plainText, htmlContent);
            mailSender.send(message);
            log.info("Issue comment added email sent successfully to: {} for issue: {}", to, issueId);
        } catch (Exception e) {
            log.error("Failed to send issue comment added email to: {} for issue: {}", to, issueId, e);
            throw new RuntimeException("Failed to send issue comment added email", e);
        }
    }

    @Override
    public void sendIssueStatusChanged(String to, String userName, String issueId, String issueTitle,
            String productName, IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt) {
        try {
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject("Estado de Incidencia Actualizado - Yambo");

            Context context = new Context();
            context.setVariable("userName", userName);
            context.setVariable("issueId", issueId);
            context.setVariable("issueTitle", issueTitle);
            context.setVariable("productName", productName);
            context.setVariable("oldStatusText", getIssueStatusText(oldStatus));
            context.setVariable("newStatusText", getIssueStatusText(newStatus));
            context.setVariable("statusColor", getIssueStatusColor(newStatus));
            context.setVariable("headerColor", getIssueStatusHeaderColor(newStatus));
            context.setVariable("headerIcon", getIssueStatusIcon(newStatus));
            context.setVariable("changedBy", changedBy);
            context.setVariable("changedAt", changedAt);
            context.setVariable("issueLink", buildIssueLink(issueId));

            String htmlContent = templateEngine.process("emails/issue-status-changed", context);
            String plainText = createPlainTextStatusChanged(userName, issueId, issueTitle, oldStatus, newStatus,
                    changedBy, changedAt);

            helper.setText(plainText, htmlContent);
            mailSender.send(message);
            log.info("Issue status changed email sent successfully to: {} for issue: {}", to, issueId);
        } catch (Exception e) {
            log.error("Failed to send issue status changed email to: {} for issue: {}", to, issueId, e);
            throw new RuntimeException("Failed to send issue status changed email", e);
        }
    }

    private String buildIssueLink(String issueId) {
        String baseUrl = settingsService.getFrontendUrl();
        return baseUrl + "/mi-espacio/incidencias/" + issueId;
    }

    private String getIssueStatusText(IssueStatus status) {
        return switch (status) {
            case OPEN -> "ABIERTO";
            case IN_PROGRESS -> "EN PROGRESO";
            case RESOLVED -> "RESUELTO";
            case CLOSED -> "CERRADO";
            case REOPENED -> "REABIERTO";
        };
    }

    private String getIssueStatusColor(IssueStatus status) {
        return switch (status) {
            case OPEN -> "#e67e22";
            case IN_PROGRESS -> "#3498db";
            case RESOLVED -> "#27ae60";
            case CLOSED -> "#6b7280";
            case REOPENED -> "#7c3aed";
        };
    }

    private String getIssueStatusHeaderColor(IssueStatus status) {
        return switch (status) {
            case OPEN -> "#e67e22";
            case IN_PROGRESS -> "#3498db";
            case RESOLVED -> "#27ae60";
            case CLOSED -> "#6b7280";
            case REOPENED -> "#7c3aed";
        };
    }

    private String getIssueStatusIcon(IssueStatus status) {
        return switch (status) {
            case OPEN -> "⚠️";
            case IN_PROGRESS -> "🔄";
            case RESOLVED -> "✓";
            case CLOSED -> "🗂️";
            case REOPENED -> "♻️";
        };
    }

    private String createPlainTextIssueCreated(String userName, String issueId, String issueTitle,
            String productName, String orderId, String createdBy, LocalDateTime createdAt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");
        sb.append("Se ha reportado una nueva incidencia con uno de tus productos.\n\n");
        sb.append("Detalles de la incidencia:\n");
        sb.append("ID: ").append(issueId).append("\n");
        sb.append("Título: ").append(issueTitle).append("\n");
        sb.append("Producto: ").append(productName).append("\n");
        sb.append("Pedido: ").append(orderId).append("\n");
        sb.append("Reportado por: ").append(createdBy).append("\n");
        sb.append("Fecha: ").append(createdAt).append("\n");
        sb.append("Estado: ABIERTO\n\n");
        sb.append("Puedes ver todos los detalles desde tu panel de control.\n\n");
        sb.append("¡Gracias!\n");
        return sb.toString();
    }

    private String createPlainTextCommentAdded(String userName, String issueId, String issueTitle,
            String commentAuthor, String commentText, LocalDateTime commentDate,
            IssueStatus oldStatus, IssueStatus newStatus) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");
        sb.append("Se ha añadido un nuevo comentario a una incidencia de tu pedido.\n\n");
        sb.append("Incidencia:\n");
        sb.append("ID: ").append(issueId).append("\n");
        sb.append("Título: ").append(issueTitle).append("\n\n");
        sb.append("Comentario de ").append(commentAuthor).append(":\n");
        sb.append(commentText).append("\n\n");
        if (oldStatus != null && newStatus != null && oldStatus != newStatus) {
            sb.append("Cambio de estado: ")
                    .append(getIssueStatusText(oldStatus))
                    .append(" → ")
                    .append(getIssueStatusText(newStatus))
                    .append("\n\n");
        }
        sb.append("Fecha: ").append(commentDate).append("\n\n");
        sb.append("Puedes responder desde tu panel de control.\n\n");
        sb.append("¡Gracias!\n");
        return sb.toString();
    }

    private String createPlainTextStatusChanged(String userName, String issueId, String issueTitle,
            IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");
        sb.append("El estado de una incidencia ha sido actualizado.\n\n");
        sb.append("Detalles de la incidencia:\n");
        sb.append("ID: ").append(issueId).append("\n");
        sb.append("Título: ").append(issueTitle).append("\n\n");
        sb.append("Cambio de estado por ").append(changedBy).append(":\n");
        sb.append(getIssueStatusText(oldStatus)).append(" → ").append(getIssueStatusText(newStatus)).append("\n");
        sb.append("Fecha: ").append(changedAt).append("\n\n");
        sb.append("Puedes ver todos los detalles desde tu panel de control.\n\n");
        sb.append("¡Gracias!\n");
        return sb.toString();
    }
}
