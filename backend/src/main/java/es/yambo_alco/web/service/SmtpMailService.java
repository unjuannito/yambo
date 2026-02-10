package es.yambo_alco.web.service;

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
            helper.setText(createPlainTextOrderNotification(userName, orderId, orderDate, newStatus, products, totalPrice), false);

            mailSender.send(message);
            log.info("Order status update email sent successfully to: {} for order: {}", to, orderId);
        } catch (MessagingException e) {
            log.error("Failed to send order status update email to: {} for order: {}", to, orderId, e);
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
}

