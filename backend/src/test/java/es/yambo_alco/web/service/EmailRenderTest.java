package es.yambo_alco.web.service;

import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.util.EmailIcons;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Renders every email template with realistic sample data and writes the
 * resulting HTML to {@code target/email-previews/}. This lets developers
 * open the files in a browser for quick visual inspection.
 *
 * <p>No mocks — uses a real {@link SpringTemplateEngine} with the classpath
 * templates so any Thymeleaf syntax error is caught at test time.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class EmailRenderTest {

    private static final Path OUTPUT_DIR = Path.of("target/email-previews");

    private SpringTemplateEngine engine;

    // ── Sample data ──────────────────────────────────────────────────────

    private static final String USER_NAME  = "Carlos García";
    private static final String USER_EMAIL = "carlos@example.com";
    private static final String ORG_NAME   = "Yambo";

    private static final String ORDER_ID   = "ORD-20260215-001";
    private static final LocalDateTime ORDER_DATE =
            LocalDateTime.of(2026, 2, 15, 14, 30);

    private static final List<MailService.OrderProductInfo> PRODUCTS = List.of(
            new MailService.OrderProductInfo("Camiseta Logo 2026",   2, BigDecimal.valueOf(18.50),  "Talla M"),
            new MailService.OrderProductInfo("Sudadera Yambo Negra", 1, BigDecimal.valueOf(35.00),  "Talla L"),
            new MailService.OrderProductInfo("Gorra Clásica",        3, BigDecimal.valueOf(12.00),  null));

    private static final BigDecimal TOTAL_PRICE = BigDecimal.valueOf(108.00);

    private static final String ISSUE_ID    = "ISS-042";
    private static final String ISSUE_TITLE = "Sudadera recibida con talla incorrecta";
    private static final String PRODUCT     = "Sudadera Yambo Negra";

    private static final String IBAN        = "ES91 2100 0418 4502 0005 1332";
    private static final String LEGAL_NAME  = "Yambo ALCO S.L.";
    private static final String FRONTEND_URL = "https://yambo-alco.es";

    // ── Setup ────────────────────────────────────────────────────────────

    @BeforeAll
    void setUp() throws IOException {
        // Build a real Thymeleaf engine pointing at the classpath templates
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");

        engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);

        Files.createDirectories(OUTPUT_DIR);
    }

    // ── Invitation ───────────────────────────────────────────────────────

    @Test
    void renderInvitation() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("invitationLink",
                FRONTEND_URL + "/register?invitation=abc123-token-xyz789");
        ctx.setVariable("expirationHours", 72L);
        ctx.setVariable("headerIcon", EmailIcons.get("envelope"));

        String html = engine.process("emails/invitation", ctx);

        assertCommonStructure(html);
        assertThat(html).contains("Has sido invitado");
        assertThat(html).contains("invitation=abc123-token-xyz789");
        assertThat(html).contains("72");

        writePreview("invitation", html);
    }

    // ── Order statuses (parameterised) ───────────────────────────────────

    @ParameterizedTest(name = "order status: {0}")
    @EnumSource(value = OrderStatus.class, names = "CANCELED", mode = EnumSource.Mode.EXCLUDE)
    void renderOrderStatus(OrderStatus status) throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName",       USER_NAME);
        ctx.setVariable("orderId",        ORDER_ID);
        ctx.setVariable("orderDate",      ORDER_DATE);
        ctx.setVariable("products",       PRODUCTS);
        ctx.setVariable("totalPrice",     TOTAL_PRICE);
        ctx.setVariable("statusLabel",    status.getLabel());
        ctx.setVariable("statusColor",    status.getColor());
        ctx.setVariable("headerColor",    status.getColor());
        ctx.setVariable("headerIcon",     EmailIcons.get(status.getIcon()));
        ctx.setVariable("clipboardIcon",  EmailIcons.get("clipboard"));
        ctx.setVariable("iban",           IBAN);
        ctx.setVariable("legalName",      LEGAL_NAME);
        ctx.setVariable("paymentReference",
                "merch " + ORDER_DATE.getYear() + " " + ORDER_ID);

        String html = engine.process(status.getEmailTemplate(), ctx);

        assertCommonStructure(html);
        assertThat(html).contains(USER_NAME);
        assertThat(html).contains(ORDER_ID);
        assertThat(html).contains("Camiseta Logo 2026");
        assertThat(html).contains("Sudadera Yambo Negra");
        assertThat(html).contains("Gorra Clásica");
        assertThat(html).containsPattern("108[.,]00");

        writePreview("order-" + status.name().toLowerCase(), html);
    }

    // ── Order cancelled (admin + user variants) ──────────────────────────

    @Test
    void renderOrderCancelledByAdmin() throws IOException {
        String html = renderCancelled(true);

        assertCommonStructure(html);
        assertThat(html).contains("cancelado por un administrador");

        writePreview("order-cancelled-by-admin", html);
    }

    @Test
    void renderOrderCancelledByUser() throws IOException {
        String html = renderCancelled(false);

        assertCommonStructure(html);
        assertThat(html).contains("Has cancelado tu pedido");

        writePreview("order-cancelled-by-user", html);
    }

    private String renderCancelled(boolean byAdmin) {
        Context ctx = baseContext();
        ctx.setVariable("userName",       USER_NAME);
        ctx.setVariable("orderId",        ORDER_ID);
        ctx.setVariable("orderDate",      ORDER_DATE);
        ctx.setVariable("products",       PRODUCTS);
        ctx.setVariable("totalPrice",     TOTAL_PRICE);
        ctx.setVariable("statusLabel",    OrderStatus.CANCELED.getLabel());
        ctx.setVariable("statusColor",    OrderStatus.CANCELED.getColor());
        ctx.setVariable("headerColor",    OrderStatus.CANCELED.getColor());
        ctx.setVariable("headerIcon",     EmailIcons.get(OrderStatus.CANCELED.getIcon()));
        ctx.setVariable("canceledByAdmin", byAdmin);

        return engine.process("emails/order-cancelled", ctx);
    }

    // ── Issue created ────────────────────────────────────────────────────

    @Test
    void renderIssueCreated() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName",     USER_NAME);
        ctx.setVariable("issueId",      ISSUE_ID);
        ctx.setVariable("issueTitle",   ISSUE_TITLE);
        ctx.setVariable("productName",  PRODUCT);
        ctx.setVariable("orderId",      ORDER_ID);
        ctx.setVariable("createdBy",    "maria_perez");
        ctx.setVariable("createdAt",    LocalDateTime.of(2026, 2, 18, 9, 15));
        ctx.setVariable("headerColor",  IssueStatus.OPEN.getColor());
        ctx.setVariable("headerIcon",   EmailIcons.get(IssueStatus.OPEN.getIcon()));
        ctx.setVariable("issueLink",    FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);

        String html = engine.process("emails/issue-created", ctx);

        assertCommonStructure(html);
        assertThat(html).contains(ISSUE_TITLE);
        assertThat(html).contains(PRODUCT);
        assertThat(html).contains("maria_perez");
        assertThat(html).contains("Ver Incidencia");

        writePreview("issue-created", html);
    }

    // ── Issue comment added (with status change) ─────────────────────────

    @Test
    void renderIssueCommentWithStatusChange() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName",       USER_NAME);
        ctx.setVariable("issueId",        ISSUE_ID);
        ctx.setVariable("issueTitle",     ISSUE_TITLE);
        ctx.setVariable("productName",    PRODUCT);
        ctx.setVariable("commentAuthor",  "admin_juan");
        ctx.setVariable("commentHtml",
                "Hemos verificado el error y procederemos a enviarte la talla correcta. "
                + "Disculpa las molestias.");
        ctx.setVariable("commentDate",    LocalDateTime.of(2026, 2, 19, 11, 45));
        ctx.setVariable("statusChanged",  true);
        ctx.setVariable("oldStatusText",  IssueStatus.OPEN.getLabel());
        ctx.setVariable("newStatusText",  IssueStatus.IN_PROGRESS.getLabel());
        ctx.setVariable("statusColor",    IssueStatus.IN_PROGRESS.getColor());
        ctx.setVariable("headerColor",    "#3498db");
        ctx.setVariable("headerIcon",     EmailIcons.get("comments"));
        ctx.setVariable("issueLink",      FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);

        String html = engine.process("emails/issue-comment-added", ctx);

        assertCommonStructure(html);
        assertThat(html).contains("admin_juan");
        assertThat(html).contains("Hemos verificado el error");
        assertThat(html).contains("Abierto");
        assertThat(html).contains("En Progreso");
        assertThat(html).contains("Ver Conversación");

        writePreview("issue-comment-status-change", html);
    }

    @Test
    void renderIssueCommentWithoutStatusChange() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName",       USER_NAME);
        ctx.setVariable("issueId",        ISSUE_ID);
        ctx.setVariable("issueTitle",     ISSUE_TITLE);
        ctx.setVariable("productName",    PRODUCT);
        ctx.setVariable("commentAuthor",  USER_NAME);
        ctx.setVariable("commentHtml",    "Gracias por la respuesta, quedo a la espera.");
        ctx.setVariable("commentDate",    LocalDateTime.of(2026, 2, 19, 14, 20));
        ctx.setVariable("statusChanged",  false);
        ctx.setVariable("oldStatusText",  "");
        ctx.setVariable("newStatusText",  "");
        ctx.setVariable("statusColor",    IssueStatus.IN_PROGRESS.getColor());
        ctx.setVariable("headerColor",    "#3498db");
        ctx.setVariable("headerIcon",     EmailIcons.get("comments"));
        ctx.setVariable("issueLink",      FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);

        String html = engine.process("emails/issue-comment-added", ctx);

        assertCommonStructure(html);
        assertThat(html).contains("Gracias por la respuesta");
        assertThat(html).doesNotContain("line-through"); // no status change shown

        writePreview("issue-comment-no-status-change", html);
    }

    // ── Issue watcher added ──────────────────────────────────────────────

    @Test
    void renderIssueWatcherAdded() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName",    USER_NAME);
        ctx.setVariable("issueId",     ISSUE_ID);
        ctx.setVariable("issueTitle",  ISSUE_TITLE);
        ctx.setVariable("productName", PRODUCT);
        ctx.setVariable("threadHtml",
                "<p><strong>maria_perez</strong> (18/02/2026 09:15): La sudadera llegó en talla XL en lugar de M.</p>"
                + "<p><strong>admin_juan</strong> (19/02/2026 11:45): Hemos verificado el error y procederemos a enviarte la talla correcta.</p>");
        ctx.setVariable("sentAt",      LocalDateTime.of(2026, 2, 20, 10, 0));
        ctx.setVariable("headerColor", "#2563eb");
        ctx.setVariable("headerIcon",  EmailIcons.get("comments"));
        ctx.setVariable("issueLink",   FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);

        String html = engine.process("emails/issue-watcher-added", ctx);

        assertCommonStructure(html);
        assertThat(html)
                .contains(USER_NAME)
                .contains(ISSUE_TITLE)
                .contains(PRODUCT)
                .contains("Hemos verificado el error")
                .contains("Ver Incidencia");

        writePreview("issue-watcher-added", html);
    }

    // ── Issue status changed (all transitions) ──────────────────────────

    @ParameterizedTest(name = "issue status: OPEN -> {0}")
    @EnumSource(value = IssueStatus.class, names = "OPEN", mode = EnumSource.Mode.EXCLUDE)
    void renderIssueStatusChanged(IssueStatus newStatus) throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName",       USER_NAME);
        ctx.setVariable("issueId",        ISSUE_ID);
        ctx.setVariable("issueTitle",     ISSUE_TITLE);
        ctx.setVariable("productName",    PRODUCT);
        ctx.setVariable("oldStatusText",  IssueStatus.OPEN.getLabel());
        ctx.setVariable("newStatusText",  newStatus.getLabel());
        ctx.setVariable("statusColor",    newStatus.getColor());
        ctx.setVariable("headerColor",    newStatus.getColor());
        ctx.setVariable("headerIcon",     EmailIcons.get(newStatus.getIcon()));
        ctx.setVariable("changedBy",      "admin_juan");
        ctx.setVariable("changedAt",      LocalDateTime.of(2026, 2, 20, 10, 0));
        ctx.setVariable("issueLink",      FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);

        String html = engine.process("emails/issue-status-changed", ctx);

        assertCommonStructure(html);
        assertThat(html).contains(newStatus.getLabel());
        assertThat(html).contains("Abierto");                   // old status
        assertThat(html).contains(newStatus.getColor());         // colour in style
        assertThat(html).contains("admin_juan");

        writePreview("issue-status-" + newStatus.name().toLowerCase(), html);
    }

    @Test
    void renderIssueStatusChanged_ReopenedLabelForClosedToOpen() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName", USER_NAME);
        ctx.setVariable("issueId", ISSUE_ID);
        ctx.setVariable("issueTitle", ISSUE_TITLE);
        ctx.setVariable("productName", PRODUCT);
        ctx.setVariable("oldStatusText", IssueStatus.CLOSED.getLabel());
        ctx.setVariable("newStatusText", "Reabierto");
        ctx.setVariable("statusColor", IssueStatus.OPEN.getColor());
        ctx.setVariable("headerColor", IssueStatus.OPEN.getColor());
        ctx.setVariable("headerIcon", EmailIcons.get(IssueStatus.OPEN.getIcon()));
        ctx.setVariable("changedBy", "admin_juan");
        ctx.setVariable("changedAt", LocalDateTime.of(2026, 2, 20, 10, 0));
        ctx.setVariable("issueLink", FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);

        String html = engine.process("emails/issue-status-changed", ctx);

        assertCommonStructure(html);
        assertThat(html)
            .contains("Cerrado")
            .contains("Reabierto");

        writePreview("issue-status-reopened", html);
    }

    // ── Password reset ───────────────────────────────────────────────────

    @Test
    void renderPasswordReset() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("resetLink",
                FRONTEND_URL + "/restablecer?token=reset-token-abc123");
        ctx.setVariable("expirationHours", 24L);
        ctx.setVariable("headerIcon", EmailIcons.get("key"));

        String html = engine.process("emails/password-reset", ctx);

        assertCommonStructure(html);
        assertThat(html).contains("Restablecer contraseña");
        assertThat(html).contains("reset-token-abc123");
        assertThat(html).contains("24");

        writePreview("password-reset", html);
    }

    // ── Activity open registration ───────────────────────────────────────

    @Test
    void renderActivityOpenRegistration() throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("activityName", "Campamento de Verano 2026");
        ctx.setVariable("activityUrl", FRONTEND_URL + "/actividades/campamento-2026");
        ctx.setVariable("headerIcon", EmailIcons.get("circle-check"));

        String html = engine.process("emails/activity-open-registration", ctx);

        assertCommonStructure(html);
        assertThat(html).contains("Campamento de Verano 2026");
        assertThat(html).contains("/actividades/campamento-2026");
        assertThat(html).contains("Apuntarme ahora");

        writePreview("activity-open-registration", html);
    }

    // ── Order admin update (create / edit) ──────────────────────────────

    @Test
    void renderOrderAdminUpdated() throws IOException {
        renderAdminUpdated("creado");
        renderAdminUpdated("modificado");
    }

    private void renderAdminUpdated(String action) throws IOException {
        Context ctx = baseContext();
        ctx.setVariable("userName", USER_NAME);
        ctx.setVariable("orderId", ORDER_ID);
        ctx.setVariable("orderDate", ORDER_DATE);
        ctx.setVariable("actionLabel", action);
        ctx.setVariable("headerTitle", "Pedido " + (action.equals("creado") ? "Creado" : "Modificado"));
        ctx.setVariable("statusLabel", OrderStatus.PENDING_PAYMENT.getLabel());
        ctx.setVariable("statusColor", OrderStatus.PENDING_PAYMENT.getColor());
        ctx.setVariable("products", PRODUCTS);
        ctx.setVariable("totalPrice", TOTAL_PRICE);
        ctx.setVariable("justification", "Pedido solicitado por WhatsApp por el socio.");
        ctx.setVariable("headerColor", "#8B5CF6");
        ctx.setVariable("headerIcon", EmailIcons.get("gear"));
        ctx.setVariable("issueLink", FRONTEND_URL + "/mi-espacio/incidencias/" + ISSUE_ID);
        ctx.setVariable("orderUrl", FRONTEND_URL + "/mi-espacio/mis-pedidos?orderId=" + ORDER_ID);
        ctx.setVariable("rows", action.equals("modificado")
                ? List.of(
                        new MailService.OrderProductRow("modified", "Camiseta Logo 2026", "1 → 2",
                                "Talla M → Talla L", "18.50 € → 20.50 €", "~", "#f39c12"),
                        new MailService.OrderProductRow("unchanged", "Sudadera Yambo Negra", "1", "Talla L",
                                "35.00 €", "", "#555555"),
                        new MailService.OrderProductRow("removed", "Gorra Clásica", "3", "", "12.00 €", "−",
                                "#e74c3c"))
                : List.of());
        ctx.setVariable("oldTotalPrice", action.equals("modificado") ? BigDecimal.valueOf(86.00) : BigDecimal.ZERO);
        ctx.setVariable("totalChanged", action.equals("modificado"));

        String html = engine.process("emails/order-admin-updated", ctx);

        assertCommonStructure(html);
        assertThat(html).contains(USER_NAME);
        assertThat(html).contains(action);
        assertThat(html).contains("Pedido solicitado por WhatsApp");
        assertThat(html).contains("Ver la discusión de la incidencia");
        if (action.equals("modificado")) {
            assertThat(html).contains("1 → 2");
            assertThat(html).contains("Talla M → Talla L");
            assertThat(html).contains("Gorra Clásica");
        } else {
            assertThat(html).contains("Camiseta Logo 2026");
        }

        writePreview("order-admin-updated-" + action, html);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Base context with variables that every template expects. */
    private Context baseContext() {
        Context ctx = new Context();
        ctx.setVariable("currentYear", Year.now().getValue());
        ctx.setVariable("organizationName", ORG_NAME);
        ctx.setVariable("preferencesUrl", FRONTEND_URL + "/mi-espacio/cuenta");
        return ctx;
    }

    /** Asserts the rendered output has the basic HTML skeleton + footer. */
    private void assertCommonStructure(String html) {
        assertThat(html)
                .as("should be valid HTML")
                .contains("<!DOCTYPE html>")
                .contains("</html>");
        assertThat(html)
                .as("should include footer with org name")
                .contains(ORG_NAME);
        assertThat(html)
                .as("should include copyright year")
                .contains(String.valueOf(Year.now().getValue()));
        assertThat(html)
                .as("should include notification preferences link")
                .contains("Gestionar preferencias de notificación")
                .contains("/mi-espacio/cuenta");
    }

    /** Writes the rendered HTML to target/email-previews/{name}.html. */
    private void writePreview(String name, String html) throws IOException {
        Path file = OUTPUT_DIR.resolve(name + ".html");
        Files.writeString(file, html);
        System.out.println("  -> Preview written: " + file.toAbsolutePath());
    }
}
