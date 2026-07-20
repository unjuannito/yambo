package es.yambo_alco.web.service;

import es.yambo_alco.web.config.MailConfig;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.util.EmailIcons;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Primary
@RequiredArgsConstructor
public class HtmlMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(HtmlMailService.class);

    private final MailConfig mailConfig;
    private final TemplateEngine templateEngine;
    private final SettingsService settingsService;
    private final MarkdownService markdownService;

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    // ── Core send helper ─────────────────────────────────────────────────

    /**
     * Sends an email with both HTML (from a Thymeleaf template) and plain-text
     * fallback. All public methods delegate here to eliminate boilerplate.
     */
    private void send(String to, String subject, String templateName,
            Map<String, Object> variables, String plainText) {
        if (!mailConfig.isConfigured()) {
            log.info("[CONSOLE MODE] Email [{}] to {}: {}", subject, to, plainText);
            return;
        }

        try {
            JavaMailSender mailSender = mailConfig.getMailSender();
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject(subject);

            Context context = new Context();
            context.setVariable("currentYear", java.time.Year.now().getValue());
            context.setVariable("organizationName", settingsService.getOrganizationName());
            context.setVariable("preferencesUrl", settingsService.getDomain() + "/mi-espacio/cuenta");
            variables.forEach(context::setVariable);

            String htmlContent = templateEngine.process(templateName, context);

            String preferencesUrl = settingsService.getDomain() + "/mi-espacio/cuenta";
            String fullPlainText = plainText
                    + "\n---\nGestionar preferencias de notificación: " + preferencesUrl + "\n";

            helper.setText(fullPlainText, htmlContent);

            mailSender.send(message);
            log.info("Email sent [{}] to: {}", subject, to);
        } catch (Exception e) {
            log.error("Failed to send email [{}] to: {}", subject, to, e);
            throw new RuntimeException("Failed to send email: " + subject, e);
        }
    }

    // ── Invitation ───────────────────────────────────────────────────────

    @Async("mailExecutor")
    @Override
    public void sendInvitation(String to, String subject, String body) {
        send(to, subject, "emails/invitation",
                Map.of(
                        "invitationLink", extractInvitationLink(body),
                        "expirationHours", expirationHours),
                body);
    }

    private String extractInvitationLink(String body) {
        if (body == null)
            return "";
        for (String word : body.split("\\s+")) {
            if (word.startsWith("http://") || word.startsWith("https://"))
                return word;
        }
        return "";
    }

    // ── Order status updates ─────────────────────────────────────────────

    @Async("mailExecutor")
    @Override
    public void sendOrderStatusUpdate(String to, String userName, String orderId,
            LocalDateTime orderDate, OrderStatus newStatus,
            List<OrderProductInfo> products, BigDecimal totalPrice) {

        String subject = newStatus.getEmailSubject() + " #" + orderId + " - " + settingsService.getOrganizationName();

        send(to, subject, newStatus.getEmailTemplate(),
                Map.ofEntries(
                        Map.entry("userName", userName),
                        Map.entry("orderId", orderId),
                        Map.entry("orderDate", orderDate),
                        Map.entry("products", products),
                        Map.entry("totalPrice", totalPrice),
                        Map.entry("statusLabel", newStatus.getLabel()),
                        Map.entry("statusColor", newStatus.getColor()),
                        Map.entry("headerColor", newStatus.getColor()),
                        Map.entry("headerIcon", EmailIcons.get(newStatus.getIcon())),
                        Map.entry("clipboardIcon", EmailIcons.get("clipboard")),
                        Map.entry("iban", settingsService.getIban()),
                        Map.entry("legalName", settingsService.getOrganizationLegalName()),
                        Map.entry("paymentReference", generatePaymentReference(orderDate, orderId)),
                        Map.entry("orderUrl", buildOrderLink(orderId))),
                buildOrderPlainText(userName, orderId, orderDate, newStatus, products, totalPrice));
    }

    @Async("mailExecutor")
    @Override
    public void sendOrderCanceled(String to, String userName, String orderId,
            LocalDateTime orderDate, List<OrderProductInfo> products,
            BigDecimal totalPrice, boolean canceledByAdmin) {

        String subject = OrderStatus.CANCELED.getEmailSubject() + " #" + orderId + " - "
                + settingsService.getOrganizationName();

        send(to, subject, "emails/order-cancelled",
                Map.ofEntries(
                        Map.entry("userName", userName),
                        Map.entry("orderId", orderId),
                        Map.entry("orderDate", orderDate),
                        Map.entry("products", products),
                        Map.entry("totalPrice", totalPrice),
                        Map.entry("statusLabel", OrderStatus.CANCELED.getLabel()),
                        Map.entry("statusColor", OrderStatus.CANCELED.getColor()),
                        Map.entry("headerColor", OrderStatus.CANCELED.getColor()),
                        Map.entry("headerIcon", EmailIcons.get(OrderStatus.CANCELED.getIcon())),
                        Map.entry("canceledByAdmin", canceledByAdmin),
                        Map.entry("orderUrl", buildOrderLink(orderId))),
                buildCancelPlainText(userName, orderId, orderDate, products, totalPrice, canceledByAdmin));
    }

    // ── Issues ───────────────────────────────────────────────────────────

    @Async("mailExecutor")
    @Override
    public void sendIssueCreated(String to, String userName, String issueId, String issueTitle,
            String productName, String orderId, String createdBy, LocalDateTime createdAt,
            String description) {

        String subject = "Nueva Incidencia #" + issueId + " - " + settingsService.getOrganizationName();
        String descriptionHtml = markdownService.toSafeHtml(description);

        send(to, subject, "emails/issue-created",
                Map.ofEntries(
                        Map.entry("userName", userName),
                        Map.entry("issueId", issueId),
                        Map.entry("issueTitle", issueTitle),
                        Map.entry("productName", productName),
                        Map.entry("orderId", orderId),
                        Map.entry("createdBy", createdBy),
                        Map.entry("createdAt", createdAt),
                        Map.entry("descriptionHtml", descriptionHtml),
                        Map.entry("headerColor", IssueStatus.OPEN.getColor()),
                        Map.entry("headerIcon", EmailIcons.get(IssueStatus.OPEN.getIcon())),
                        Map.entry("issueLink", buildIssueLink(issueId))),
                buildIssueCreatedPlainText(userName, issueId, issueTitle, productName, orderId, createdBy, createdAt,
                        description));
    }

    @Async("mailExecutor")
    @Override
    public void sendIssueCommentAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String commentAuthor, String commentText, LocalDateTime commentDate,
            IssueStatus oldStatus, IssueStatus newStatus) {

        boolean statusChanged = oldStatus != null && newStatus != null && oldStatus != newStatus;

        String subject = "Nuevo Comentario en Incidencia #" + issueId + " - " + settingsService.getOrganizationName();

        String commentHtml = markdownService.toSafeHtml(commentText);

        send(to, subject, "emails/issue-comment-added",
                Map.ofEntries(
                        Map.entry("userName", userName),
                        Map.entry("issueId", issueId),
                        Map.entry("issueTitle", issueTitle),
                        Map.entry("productName", productName),
                        Map.entry("commentAuthor", commentAuthor),
                        Map.entry("commentText", commentText),
                        Map.entry("commentHtml", commentHtml),
                        Map.entry("commentDate", commentDate),
                        Map.entry("statusChanged", statusChanged),
                        Map.entry("oldStatusText", oldStatus != null ? oldStatus.getLabel() : ""),
                        Map.entry("newStatusText", toIssueEmailStatusText(oldStatus, newStatus)),
                        Map.entry("statusColor", newStatus != null ? newStatus.getColor() : "#3498db"),
                        Map.entry("headerColor", "#3498db"),
                        Map.entry("headerIcon", EmailIcons.get("comments")),
                        Map.entry("issueLink", buildIssueLink(issueId))),
                buildCommentPlainText(userName, issueId, issueTitle, commentAuthor, commentText,
                        commentDate, oldStatus, newStatus));
    }

    @Async("mailExecutor")
    @Override
    public void sendIssueStatusChanged(String to, String userName, String issueId, String issueTitle,
            String productName, IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt) {

        String subject = "Incidencia #" + issueId + " Actualizada - " + settingsService.getOrganizationName();

        send(to, subject, "emails/issue-status-changed",
                Map.ofEntries(
                        Map.entry("userName", userName),
                        Map.entry("issueId", issueId),
                        Map.entry("issueTitle", issueTitle),
                        Map.entry("productName", productName),
                        Map.entry("oldStatusText", oldStatus.getLabel()),
                        Map.entry("newStatusText", toIssueEmailStatusText(oldStatus, newStatus)),
                        Map.entry("statusColor", newStatus.getColor()),
                        Map.entry("headerColor", newStatus.getColor()),
                        Map.entry("headerIcon", EmailIcons.get(newStatus.getIcon())),
                        Map.entry("changedBy", changedBy),
                        Map.entry("changedAt", changedAt),
                        Map.entry("issueLink", buildIssueLink(issueId))),
                buildStatusChangedPlainText(userName, issueId, issueTitle, oldStatus, newStatus, changedBy, changedAt));
    }

    @Async("mailExecutor")
    @Override
    public void sendIssueWatcherAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String threadMarkdown, LocalDateTime sentAt) {

        String subject = "Has sido añadido como seguidor de la incidencia #" + issueId + " - "
                + settingsService.getOrganizationName();
        String threadHtml = markdownService.toSafeHtml(threadMarkdown);

        send(to, subject, "emails/issue-watcher-added",
                Map.ofEntries(
                        Map.entry("userName", userName),
                        Map.entry("issueId", issueId),
                        Map.entry("issueTitle", issueTitle),
                        Map.entry("productName", productName),
                        Map.entry("threadHtml", threadHtml),
                        Map.entry("sentAt", sentAt),
                        Map.entry("headerColor", "#2563eb"),
                        Map.entry("headerIcon", EmailIcons.get("comments")),
                        Map.entry("issueLink", buildIssueLink(issueId))),
                buildWatcherAddedPlainText(userName, issueId, issueTitle, threadMarkdown, sentAt));
    }

    // ── Password Reset ───────────────────────────────────────────────────

    @Async("mailExecutor")
    @Override
    public void sendPasswordResetEmail(String to, String resetLink, long expirationHours) {
        String orgName = settingsService.getOrganizationName();
        String subject = "Restablecer contraseña - " + orgName;

        String plainText = "Hola,\n\n"
                + "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en " + orgName + ".\n\n"
                + "Usa este enlace para establecer una nueva contraseña: " + resetLink + "\n\n"
                + "El enlace expirará en " + expirationHours + " horas.\n\n"
                + "Si no has solicitado restablecer tu contraseña, puedes ignorar este correo.\n";

        send(to, subject, "emails/password-reset",
                Map.of(
                        "resetLink", resetLink,
                        "expirationHours", expirationHours),
                plainText);
    }

    // ── Activity Waitlist ────────────────────────────────────────────────

    @Async("mailExecutor")
    @Override
    public void sendActivityOpenRegistration(String to, String activityName, String activityUrl) {
        String orgName = settingsService.getOrganizationName();
        String subject = "¡" + activityName + " ya está abierta! - " + orgName;

        String plainText = "Hola,\n\n"
                + "La actividad \"" + activityName + "\" ya tiene las inscripciones abiertas.\n\n"
                + "Puedes apuntarte en el siguiente enlace:\n"
                + activityUrl + "\n\n"
                + "¡No esperes demasiado, las plazas son limitadas!\n\n"
                + "Un saludo,\n"
                + orgName;

        send(to, subject, "emails/activity-open-registration",
                Map.of(
                        "activityName", activityName,
                        "activityUrl", activityUrl),
                plainText);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private String buildIssueLink(String issueId) {
        return settingsService.getDomain() + "/mi-espacio/incidencias/" + issueId;
    }

    private String buildOrderLink() {
        return settingsService.getDomain() + "/mi-espacio/mis-pedidos";
    }

    private String buildOrderLink(String orderId) {
        return buildOrderLink() + "?orderId=" + orderId;
    }

    // ── Plain-text builders ──────────────────────────────────────────────

    private void appendProductList(StringBuilder sb, List<OrderProductInfo> products, BigDecimal totalPrice) {
        sb.append("Productos:\n");
        for (OrderProductInfo p : products) {
            sb.append("- ").append(p.name())
                    .append(" x").append(p.quantity())
                    .append(" - ").append(p.price()).append(" €");
            if (p.configuration() != null && !p.configuration().isEmpty()) {
                sb.append(" (").append(p.configuration()).append(")");
            }
            sb.append("\n");
        }
        sb.append("\nTotal: ").append(totalPrice).append(" €\n");
    }

    private String buildOrderPlainText(String userName, String orderId,
            LocalDateTime orderDate, OrderStatus status,
            List<OrderProductInfo> products, BigDecimal totalPrice) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");

        sb.append(status.getEmailIntro()).append("\n\n");

        sb.append("Detalles del Pedido:\n");
        sb.append("ID: ").append(orderId).append("\n");
        sb.append("Estado: ").append(status.getLabel()).append("\n");
        sb.append("Fecha: ").append(orderDate).append("\n\n");
        appendProductList(sb, products, totalPrice);

        if (status == OrderStatus.PENDING_PAYMENT) {
            sb.append("\nInstrucciones de Pago:\n");
            sb.append("Beneficiario: ").append(settingsService.getOrganizationLegalName()).append("\n");
            sb.append("IBAN: ").append(settingsService.getIban()).append("\n");
            sb.append("Concepto: ").append(generatePaymentReference(orderDate, orderId)).append("\n");
            sb.append("Importe: ").append(totalPrice).append(" €\n");
        }

        sb.append("\nVer tu pedido: ").append(buildOrderLink(orderId)).append("\n");
        sb.append("\n¡Gracias por tu compra!\n");
        return sb.toString();
    }

    private String buildCancelPlainText(String userName, String orderId,
            LocalDateTime orderDate, List<OrderProductInfo> products,
            BigDecimal totalPrice, boolean canceledByAdmin) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");
        sb.append(canceledByAdmin
                ? "Tu pedido ha sido cancelado por un administrador.\n\n"
                : "Has cancelado tu pedido correctamente.\n\n");

        sb.append("Detalles del Pedido:\n");
        sb.append("ID: ").append(orderId).append("\n");
        sb.append("Estado: CANCELADO\n");
        sb.append("Fecha: ").append(orderDate).append("\n\n");
        appendProductList(sb, products, totalPrice);

        if (canceledByAdmin) {
            sb.append("\nSi tienes alguna pregunta sobre la cancelación, no dudes en contactarnos.\n");
        }
        sb.append("\nVer tu pedido: ").append(buildOrderLink(orderId)).append("\n");
        sb.append("\n¡Gracias!\n");
        return sb.toString();
    }

    private String buildIssueCreatedPlainText(String userName, String issueId, String issueTitle,
            String productName, String orderId, String createdBy, LocalDateTime createdAt,
            String description) {
        return "Hola " + userName + ",\n\n"
                + "Se ha reportado una nueva incidencia con uno de tus productos.\n\n"
                + "Detalles de la incidencia:\n"
                + "ID: " + issueId + "\n"
                + "Título: " + issueTitle + "\n"
                + "Producto: " + productName + "\n"
                + "Pedido: " + orderId + "\n"
                + "Reportado por: " + createdBy + "\n"
                + "Fecha: " + createdAt + "\n"
                + "Estado: ABIERTO\n\n"
                + "Descripción:\n" + markdownService.toPlainText(description) + "\n\n"
                + "Puedes ver todos los detalles desde tu panel de control.\n\n"
                + "¡Gracias!\n";
    }

    private String buildCommentPlainText(String userName, String issueId, String issueTitle,
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
                    .append(oldStatus.getLabel())
                    .append(" → ")
                    .append(toIssueEmailStatusText(oldStatus, newStatus))
                    .append("\n\n");
        }
        sb.append("Fecha: ").append(commentDate).append("\n\n");
        sb.append("Puedes responder desde tu panel de control.\n\n");
        sb.append("¡Gracias!\n");
        return sb.toString();
    }

    private String buildStatusChangedPlainText(String userName, String issueId, String issueTitle,
            IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt) {
        return "Hola " + userName + ",\n\n"
                + "El estado de una incidencia ha sido actualizado.\n\n"
                + "Detalles de la incidencia:\n"
                + "ID: " + issueId + "\n"
                + "Título: " + issueTitle + "\n\n"
                + "Cambio de estado por " + changedBy + ":\n"
                + oldStatus.getLabel() + " → " + toIssueEmailStatusText(oldStatus, newStatus) + "\n"
                + "Fecha: " + changedAt + "\n\n"
                + "Puedes ver todos los detalles desde tu panel de control.\n\n"
                + "¡Gracias!\n";
    }

    private String toIssueEmailStatusText(IssueStatus oldStatus, IssueStatus newStatus) {
        if (oldStatus == null || newStatus == null) {
            return "";
        }
        if (oldStatus == IssueStatus.CLOSED && newStatus == IssueStatus.OPEN) {
            return "Reabierto";
        }
        return newStatus.getLabel();
    }

    private String buildWatcherAddedPlainText(String userName, String issueId, String issueTitle,
            String threadMarkdown, LocalDateTime sentAt) {
        return "Hola " + userName + ",\n\n"
                + "Has sido añadido como seguidor de una incidencia.\n\n"
                + "Incidencia:\n"
                + "ID: " + issueId + "\n"
                + "Título: " + issueTitle + "\n"
                + "Fecha de envío: " + sentAt + "\n\n"
                + "Hilo actual:\n"
                + markdownService.toPlainText(threadMarkdown) + "\n\n"
                + "Ver incidencia: " + buildIssueLink(issueId) + "\n\n"
                + "¡Gracias!\n";
    }
}
