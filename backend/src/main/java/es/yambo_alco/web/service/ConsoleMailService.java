package es.yambo_alco.web.service;

import es.yambo_alco.web.model.enums.OrderStatus;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@ConditionalOnMissingBean(name = "javaMailSender")
@RequiredArgsConstructor
public class ConsoleMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleMailService.class);

    private final SettingsService settingsService;

    @PostConstruct
    public void init() {
        log.warn("==============================================================");
        log.warn("  MAIL SERVICE: Console Mode (Development)");
        log.warn("  Emails will be logged to console instead of being sent.");
        log.warn("  Configure SMTP settings to enable real email sending.");
        log.warn("  See MAIL_CONFIGURATION.md for setup instructions.");
        log.warn("==============================================================");
    }

    @Override
    public void sendInvitation(String to, String subject, String body) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║              INVITATION EMAIL (CONSOLE MODE)               ║");
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ To:      {}", to);
        log.info("║ Subject: {}", subject);
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ Body:");
        body.lines().forEach(line -> log.info("║   {}", line));
        log.info("╚════════════════════════════════════════════════════════════╝");
    }

    @Override
    public void sendOrderStatusUpdate(String to, String userName, String orderId,
                                       LocalDateTime orderDate, OrderStatus newStatus,
                                       List<OrderProductInfo> products, BigDecimal totalPrice) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║         ORDER STATUS UPDATE EMAIL (CONSOLE MODE)           ║");
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ To:         {}", to);
        log.info("║ User Name:  {}", userName);
        log.info("║ Order ID:   {}", orderId);
        log.info("║ Order Date: {}", orderDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        log.info("║ New Status: {}", newStatus);
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ Products:");
        for (OrderProductInfo product : products) {
            String configInfo = (product.getConfiguration() != null && !product.getConfiguration().isEmpty())
                ? " (" + product.getConfiguration() + ")" : "";
            log.info("║   - {} x{} - {} €{}", product.getName(), product.getQuantity(), product.getPrice(), configInfo);
        }
        log.info("║ Total: {} €", totalPrice);
        if (newStatus == OrderStatus.PENDING_CONFIRMATION) {
            String iban = settingsService.getIban();
            String legalName = settingsService.getOrganizationLegalName();
            String paymentReference = generatePaymentReference(orderDate, orderId);

            log.info("╠════════════════════════════════════════════════════════════╣");
            log.info("║ PAYMENT INSTRUCTIONS:");
            log.info("║ Beneficiario: {}", legalName);
            log.info("║ IBAN: {}", iban);
            log.info("║ Concepto: {}", paymentReference);
            log.info("║ Importe: {} €", totalPrice);
        }
        log.info("╚════════════════════════════════════════════════════════════╝");
    }
}

