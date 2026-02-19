package es.yambo_alco.web.service;

import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@ConditionalOnBean(JavaMailSender.class)
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(SmtpMailService.class);

    private final JavaMailSender mailSender;
    private final SettingsService settingsService;

    @Override
    public void sendInvitation(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false); // false = plain text, true = HTML

            mailSender.send(message);
            log.info("Invitation email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send invitation email to: {}", to, e);
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    @Override
    public void sendOrderStatusUpdate(String to, String userName, String orderId,
            LocalDateTime orderDate, OrderStatus newStatus,
            List<OrderProductInfo> products, BigDecimal totalPrice) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(getSubjectForStatus(newStatus));
            helper.setText(
                    createPlainTextOrderNotification(userName, orderId, orderDate, newStatus, products, totalPrice),
                    false);

            mailSender.send(message);
            log.info("Order status update email sent successfully to: {} for order: {}", to, orderId);
        } catch (MessagingException e) {
            log.error("Failed to send order status update email to: {} for order: {}", to, orderId, e);
            throw new RuntimeException("Failed to send order status update email", e);
        }
    }

    private String getSubjectForStatus(OrderStatus status) {
        return switch (status) {
            case PENDING_PAYMENT -> "Pedido Pendiente de Pago - Yambo";
            case PAYMENT_CONFIRMED -> "Pago Confirmado - Yambo";
            case CANCELED -> "Pedido Cancelado - Yambo";
            case PENDING_PRODUCTS -> "Pedido en Preparación - Yambo";
            case CLOSED -> "Pedido Completado - Yambo";
        };
    }

    private String createPlainTextOrderNotification(String userName, String orderId,
            LocalDateTime orderDate, OrderStatus status,
            List<OrderProductInfo> products, BigDecimal totalPrice) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");

        switch (status) {
            case PENDING_PAYMENT -> sb.append("Hemos recibido tu pedido. Para completar el proceso, realiza el pago.\n\n");
            case PAYMENT_CONFIRMED -> sb.append("Tu pago ha sido confirmado y tu pedido será procesado en breve.\n\n");
            case PENDING_PRODUCTS -> sb.append("Tu pedido está ahora en preparación. Nuestro equipo está trabajando en él.\n\n");
            case CLOSED -> sb.append("¡Buenas noticias! Tu pedido ha sido entregado exitosamente.\n\n");
            case CANCELED -> sb.append("Tu pedido ha sido cancelado.\n\n");
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

        if (status == OrderStatus.PENDING_PAYMENT) {
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

    @Override
    public void sendOrderCanceled(String to, String userName, String orderId,
            LocalDateTime orderDate, List<OrderProductInfo> products,
            BigDecimal totalPrice, boolean canceledByAdmin) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Pedido Cancelado - Yambo");
            helper.setText(createPlainTextCancelNotification(userName, orderId, orderDate, products, totalPrice,
                    canceledByAdmin), false);

            mailSender.send(message);
            log.info("Order canceled email sent successfully to: {} for order: {}", to, orderId);
        } catch (MessagingException e) {
            log.error("Failed to send order canceled email to: {} for order: {}", to, orderId, e);
            throw new RuntimeException("Failed to send order canceled email", e);
        }
    }

    private String createPlainTextCancelNotification(String userName, String orderId,
            LocalDateTime orderDate,
            List<OrderProductInfo> products, BigDecimal totalPrice,
            boolean canceledByAdmin) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hola ").append(userName).append(",\n\n");

        if (canceledByAdmin) {
            sb.append("Tu pedido ha sido cancelado por un administrador.\n\n");
        } else {
            sb.append("Has cancelado tu pedido correctamente.\n\n");
        }

        sb.append("Detalles del Pedido:\n");
        sb.append("ID: ").append(orderId).append("\n");
        sb.append("Estado: CANCELADO\n");
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

        if (canceledByAdmin) {
            sb.append("\nSi tienes alguna pregunta sobre la cancelación, no dudes en contactarnos.\n");
        }

        sb.append("\n¡Gracias!\n");
        return sb.toString();
    }

    private String getStatusText(OrderStatus status) {
        return switch (status) {
            case PENDING_PAYMENT -> "PENDIENTE DE PAGO";
            case PAYMENT_CONFIRMED -> "PAGO CONFIRMADO";
            case CANCELED -> "CANCELADO";
            case PENDING_PRODUCTS -> "PENDIENTE DE PRODUCTOS";
            case CLOSED -> "COMPLETADO";
        };
    }

    @Override
    public void sendIssueCreated(String to, String userName, String issueId, String issueTitle,
            String productName, String orderId, String createdBy, LocalDateTime createdAt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Nueva Incidencia Reportada - Yambo");

            StringBuilder body = new StringBuilder();
            body.append("Hola ").append(userName).append(",\n\n");
            body.append("Se ha reportado una nueva incidencia con uno de tus productos.\n\n");
            body.append("Detalles de la incidencia:\n");
            body.append("ID: ").append(issueId).append("\n");
            body.append("Título: ").append(issueTitle).append("\n");
            body.append("Producto: ").append(productName).append("\n");
            body.append("Pedido: ").append(orderId).append("\n");
            body.append("Reportado por: ").append(createdBy).append("\n");
            body.append("Fecha: ").append(createdAt).append("\n");
            body.append("Estado: ABIERTO\n\n");
            body.append("Puedes ver todos los detalles desde tu panel de control.\n\n");
            body.append("¡Gracias!\n");

            helper.setText(body.toString(), false);
            mailSender.send(message);
            log.info("Issue created email sent successfully to: {} for issue: {}", to, issueId);
        } catch (MessagingException e) {
            log.error("Failed to send issue created email to: {} for issue: {}", to, issueId, e);
            throw new RuntimeException("Failed to send issue created email", e);
        }
    }

    @Override
    public void sendIssueCommentAdded(String to, String userName, String issueId, String issueTitle,
            String productName, String commentAuthor, String commentText, LocalDateTime commentDate,
            IssueStatus oldStatus, IssueStatus newStatus) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Nuevo Comentario en Incidencia - Yambo");

            StringBuilder body = new StringBuilder();
            body.append("Hola ").append(userName).append(",\n\n");
            body.append("Se ha añadido un nuevo comentario a una incidencia de tu pedido.\n\n");
            body.append("Incidencia:\n");
            body.append("ID: ").append(issueId).append("\n");
            body.append("Título: ").append(issueTitle).append("\n\n");
            body.append("Comentario de ").append(commentAuthor).append(":\n");
            body.append(commentText).append("\n\n");
            if (oldStatus != null && newStatus != null && oldStatus != newStatus) {
                body.append("Cambio de estado: ")
                        .append(getIssueStatusText(oldStatus))
                        .append(" → ")
                        .append(getIssueStatusText(newStatus))
                        .append("\n\n");
            }
            body.append("Fecha: ").append(commentDate).append("\n\n");
            body.append("Puedes responder desde tu panel de control.\n\n");
            body.append("¡Gracias!\n");

            helper.setText(body.toString(), false);
            mailSender.send(message);
            log.info("Issue comment added email sent successfully to: {} for issue: {}", to, issueId);
        } catch (MessagingException e) {
            log.error("Failed to send issue comment added email to: {} for issue: {}", to, issueId, e);
            throw new RuntimeException("Failed to send issue comment added email", e);
        }
    }

    @Override
    public void sendIssueStatusChanged(String to, String userName, String issueId, String issueTitle,
            String productName, IssueStatus oldStatus, IssueStatus newStatus,
            String changedBy, LocalDateTime changedAt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Estado de Incidencia Actualizado - Yambo");

            StringBuilder body = new StringBuilder();
            body.append("Hola ").append(userName).append(",\n\n");
            body.append("El estado de una incidencia ha sido actualizado.\n\n");
            body.append("Detalles de la incidencia:\n");
            body.append("ID: ").append(issueId).append("\n");
            body.append("Título: ").append(issueTitle).append("\n\n");
            body.append("Cambio de estado por ").append(changedBy).append(":\n");
            body.append(getIssueStatusText(oldStatus)).append(" → ").append(getIssueStatusText(newStatus)).append("\n");
            body.append("Fecha: ").append(changedAt).append("\n\n");
            body.append("Puedes ver todos los detalles desde tu panel de control.\n\n");
            body.append("¡Gracias!\n");

            helper.setText(body.toString(), false);
            mailSender.send(message);
            log.info("Issue status changed email sent successfully to: {} for issue: {}", to, issueId);
        } catch (MessagingException e) {
            log.error("Failed to send issue status changed email to: {} for issue: {}", to, issueId, e);
            throw new RuntimeException("Failed to send issue status changed email", e);
        }
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
}
