package es.yambo_alco.web.service;

import es.yambo_alco.web.model.enums.IssueStatus;
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

    @Override
    public void sendIssueCreated(String to, String userName, String issueId, String issueTitle,
                                 String productName, String orderId, String createdBy, LocalDateTime createdAt) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║         ISSUE CREATED EMAIL (CONSOLE MODE)                 ║");
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ To:         {}", to);
        log.info("║ User Name:  {}", userName);
        log.info("║ Issue ID:   {}", issueId);
        log.info("║ Title:      {}", issueTitle);
        log.info("║ Product:    {}", productName);
        log.info("║ Order ID:   {}", orderId);
        log.info("║ Created By: {}", createdBy);
        log.info("║ Created At: {}", createdAt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        log.info("║ Status:     OPEN");
        log.info("╚════════════════════════════════════════════════════════════╝");
    }

    @Override
    public void sendIssueCommentAdded(String to, String userName, String issueId, String issueTitle,
                                      String productName, String commentAuthor, String commentText, LocalDateTime commentDate,
                                      IssueStatus oldStatus, IssueStatus newStatus) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║       ISSUE COMMENT ADDED EMAIL (CONSOLE MODE)             ║");
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ To:           {}", to);
        log.info("║ User Name:    {}", userName);
        log.info("║ Issue ID:     {}", issueId);
        log.info("║ Title:        {}", issueTitle);
        log.info("║ Product:      {}", productName);
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ Comment by:   {}", commentAuthor);
        log.info("║ Comment Date: {}", commentDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        if (oldStatus != null && newStatus != null && oldStatus != newStatus) {
            log.info("║ Status Change: {} → {}", getStatusText(oldStatus), getStatusText(newStatus));
        }
        log.info("║ Comment:");
        commentText.lines().forEach(line -> log.info("║   {}", line));
        log.info("╚════════════════════════════════════════════════════════════╝");
    }

    @Override
    public void sendIssueStatusChanged(String to, String userName, String issueId, String issueTitle,
                                       String productName, IssueStatus oldStatus, IssueStatus newStatus,
                                       String changedBy, LocalDateTime changedAt) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║      ISSUE STATUS CHANGED EMAIL (CONSOLE MODE)             ║");
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ To:         {}", to);
        log.info("║ User Name:  {}", userName);
        log.info("║ Issue ID:   {}", issueId);
        log.info("║ Title:      {}", issueTitle);
        log.info("║ Product:    {}", productName);
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ Changed By: {}", changedBy);
        log.info("║ Changed At: {}", changedAt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        log.info("║ Old Status: {}", getStatusText(oldStatus));
        log.info("║ New Status: {}", getStatusText(newStatus));
        log.info("╚════════════════════════════════════════════════════════════╝");
    }

    private String getStatusText(IssueStatus status) {
        return switch (status) {
            case OPEN -> "OPEN";
            case IN_PROGRESS -> "IN_PROGRESS";
            case RESOLVED -> "RESOLVED";
            case CLOSED -> "CLOSED";
            case REOPENED -> "REOPENED";
        };
    }
}

