package es.yambo_alco.web.service;

import es.yambo_alco.web.config.MailConfig;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HtmlMailServiceTest {

    @Mock
    private MailConfig mailConfig;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private TemplateEngine templateEngine;

    @Mock
    private SettingsService settingsService;

    @Mock
    private MimeMessage mimeMessage;

    @InjectMocks
    private HtmlMailService htmlMailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(htmlMailService, "expirationHours", 72L);
        // Mock MailConfig as configured
        lenient().when(mailConfig.isConfigured()).thenReturn(true);
        lenient().when(mailConfig.getMailSender()).thenReturn(mailSender);
        // Mock SettingsService responses
        lenient().when(settingsService.getEmailFrom()).thenReturn("noreply@yambo-alco.es");
        lenient().when(settingsService.getEmailFromName()).thenReturn("Yambo");
        lenient().when(settingsService.getOrganizationName()).thenReturn("Yambo");
        lenient().when(settingsService.getOrganizationLegalName()).thenReturn("Yambo S.L.");
        lenient().when(settingsService.getIban()).thenReturn("ES12 3456 7890 1234 5678 9012");
        lenient().when(settingsService.getFrontendUrl()).thenReturn("https://yambo-alco.es");
    }

    // ── Invitation ───────────────────────────────────────────────────────

    @Test
    void sendInvitation_ShouldSendEmailSuccessfully() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/invitation"), any())).thenReturn("<html>Invitation Email</html>");

        String to = "test@example.com";
        String subject = "Invitación a Yambo";
        String body = "Has sido invitado a registrarte. http://localhost:5173/register?invitation=token123";

        // When
        htmlMailService.sendInvitation(to, subject, body);

        // Then
        verify(mailSender).createMimeMessage();
        verify(templateEngine).process(eq("emails/invitation"), any());
        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendInvitation_WhenMessagingExceptionOccurs_ShouldThrowRuntimeException() {
        // Given
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("Mail server error"));

        String to = "test@example.com";
        String subject = "Invitación a Yambo";
        String body = "Has sido invitado.";

        // When & Then
        assertThatThrownBy(() -> htmlMailService.sendInvitation(to, subject, body))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to send email");

        verify(mailSender).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendInvitation_ShouldCallMailSenderOnce() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/invitation"), any())).thenReturn("<html>Email</html>");

        // When
        htmlMailService.sendInvitation("user@test.com", "Subject", "Body with link http://example.com");

        // Then
        verify(mailSender, times(1)).send(mimeMessage);
        verify(templateEngine, times(1)).process(eq("emails/invitation"), any());
    }

    // ── Order status updates ─────────────────────────────────────────────

    @Test
    void sendOrderStatusUpdate_ShouldResolveIconFromFile() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/order-pending-payment"), any())).thenReturn("<html>Order</html>");

        List<MailService.OrderProductInfo> products = List.of(
                new MailService.OrderProductInfo("Camiseta", 2, BigDecimal.valueOf(15.00), "Talla M"));

        // When
        htmlMailService.sendOrderStatusUpdate(
                "buyer@test.com", "Juan", "ORD001",
                LocalDateTime.of(2026, 1, 15, 10, 0),
                OrderStatus.PENDING_PAYMENT, products, BigDecimal.valueOf(30.00));

        // Then
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("emails/order-pending-payment"), contextCaptor.capture());

        Context ctx = contextCaptor.getValue();
        String headerIcon = (String) ctx.getVariable("headerIcon");
        assertThat(headerIcon).isNotNull().startsWith("<svg").contains("</svg>");

        String clipboardIcon = (String) ctx.getVariable("clipboardIcon");
        assertThat(clipboardIcon).isNotNull().startsWith("<svg").contains("</svg>");

        assertThat((String) ctx.getVariable("headerColor")).isEqualTo("#f39c12");
        assertThat((String) ctx.getVariable("statusLabel")).isEqualTo("PENDIENTE DE PAGO");

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendOrderStatusUpdate_ForEachStatus_ShouldUseCorrectTemplate() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(anyString(), any())).thenReturn("<html></html>");

        List<MailService.OrderProductInfo> products = List.of(
                new MailService.OrderProductInfo("Item", 1, BigDecimal.TEN, null));

        // When & Then – each status uses its own template
        for (OrderStatus status : OrderStatus.values()) {
            if (status == OrderStatus.CANCELED) continue; // tested separately

            htmlMailService.sendOrderStatusUpdate(
                    "buyer@test.com", "User", "ORD002",
                    LocalDateTime.now(), status, products, BigDecimal.TEN);

            verify(templateEngine).process(eq(status.getEmailTemplate()), any());
        }
    }

    @Test
    void sendOrderCanceled_ShouldResolveIconFromFile() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/order-cancelled"), any())).thenReturn("<html>Cancelled</html>");

        List<MailService.OrderProductInfo> products = List.of(
                new MailService.OrderProductInfo("Sudadera", 1, BigDecimal.valueOf(25.00), null));

        // When
        htmlMailService.sendOrderCanceled(
                "buyer@test.com", "Ana", "ORD003",
                LocalDateTime.of(2026, 2, 1, 14, 30),
                products, BigDecimal.valueOf(25.00), true);

        // Then
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("emails/order-cancelled"), contextCaptor.capture());

        Context ctx = contextCaptor.getValue();
        String headerIcon = (String) ctx.getVariable("headerIcon");
        assertThat(headerIcon).isNotNull().startsWith("<svg").contains("</svg>");
        assertThat((String) ctx.getVariable("headerColor")).isEqualTo("#e74c3c");
        assertThat((Boolean) ctx.getVariable("canceledByAdmin")).isTrue();

        verify(mailSender).send(mimeMessage);
    }

    // ── Issue emails ─────────────────────────────────────────────────────

    @Test
    void sendIssueCreated_ShouldPassHeaderIconAndColor() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/issue-created"), any())).thenReturn("<html>Issue</html>");

        // When
        htmlMailService.sendIssueCreated(
                "admin@test.com", "Admin", "ISS001", "Producto dañado",
                "Camiseta", "ORD001", "user01", LocalDateTime.of(2026, 2, 10, 9, 0));

        // Then
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("emails/issue-created"), contextCaptor.capture());

        Context ctx = contextCaptor.getValue();
        String headerIcon = (String) ctx.getVariable("headerIcon");
        assertThat(headerIcon).isNotNull().startsWith("<svg").contains("</svg>");
        assertThat((String) ctx.getVariable("headerColor")).isEqualTo(IssueStatus.OPEN.getColor());
        assertThat((String) ctx.getVariable("issueLink")).contains("/mi-espacio/incidencias/ISS001");

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendIssueCommentAdded_ShouldPassHeaderIconAndColor() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/issue-comment-added"), any())).thenReturn("<html>Comment</html>");

        // When
        htmlMailService.sendIssueCommentAdded(
                "user@test.com", "User", "ISS002", "Falta un artículo",
                "Gorra", "admin01", "Estamos investigando",
                LocalDateTime.of(2026, 2, 12, 16, 0),
                IssueStatus.OPEN, IssueStatus.IN_PROGRESS);

        // Then
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("emails/issue-comment-added"), contextCaptor.capture());

        Context ctx = contextCaptor.getValue();
        String headerIcon = (String) ctx.getVariable("headerIcon");
        assertThat(headerIcon).isNotNull().startsWith("<svg").contains("</svg>");
        assertThat((String) ctx.getVariable("headerColor")).isEqualTo("#3498db");
        assertThat((Boolean) ctx.getVariable("statusChanged")).isTrue();
        assertThat((String) ctx.getVariable("oldStatusText")).isEqualTo("ABIERTO");
        assertThat((String) ctx.getVariable("newStatusText")).isEqualTo("EN PROGRESO");

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendIssueStatusChanged_ShouldResolveIconFromFile() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/issue-status-changed"), any())).thenReturn("<html>Status</html>");

        // When
        htmlMailService.sendIssueStatusChanged(
                "user@test.com", "User", "ISS003", "Talla incorrecta",
                "Pantalón", IssueStatus.OPEN, IssueStatus.RESOLVED,
                "admin01", LocalDateTime.of(2026, 2, 15, 11, 30));

        // Then
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("emails/issue-status-changed"), contextCaptor.capture());

        Context ctx = contextCaptor.getValue();
        String headerIcon = (String) ctx.getVariable("headerIcon");
        assertThat(headerIcon).isNotNull().startsWith("<svg").contains("</svg>");
        assertThat((String) ctx.getVariable("headerColor")).isEqualTo(IssueStatus.RESOLVED.getColor());
        assertThat((String) ctx.getVariable("oldStatusText")).isEqualTo("ABIERTO");
        assertThat((String) ctx.getVariable("newStatusText")).isEqualTo("RESUELTO");

        verify(mailSender).send(mimeMessage);
    }

    // ── Console mode (mail not configured) ───────────────────────────────

    @Test
    void sendOrderStatusUpdate_WhenNotConfigured_ShouldLogOnly() {
        // Given
        when(mailConfig.isConfigured()).thenReturn(false);

        List<MailService.OrderProductInfo> products = List.of(
                new MailService.OrderProductInfo("Item", 1, BigDecimal.TEN, null));

        // When
        htmlMailService.sendOrderStatusUpdate(
                "buyer@test.com", "User", "ORD004",
                LocalDateTime.now(), OrderStatus.PAYMENT_CONFIRMED, products, BigDecimal.TEN);

        // Then – no mail sent
        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendIssueCreated_WhenNotConfigured_ShouldLogOnly() {
        // Given
        when(mailConfig.isConfigured()).thenReturn(false);

        // When
        htmlMailService.sendIssueCreated(
                "admin@test.com", "Admin", "ISS010", "Test",
                "Product", "ORD010", "user01", LocalDateTime.now());

        // Then – no mail sent
        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }
}
