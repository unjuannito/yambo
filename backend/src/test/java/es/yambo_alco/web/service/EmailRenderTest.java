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
                "merch-" + ORDER_DATE.getYear() + "-" + ORDER_ID);

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
        assertThat(html).contains("ABIERTO");
        assertThat(html).contains("EN PROGRESO");
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
        assertThat(html).contains("ABIERTO");                   // old status
        assertThat(html).contains(newStatus.getColor());         // colour in style
        assertThat(html).contains("admin_juan");

        writePreview("issue-status-" + newStatus.name().toLowerCase(), html);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Base context with variables that every template expects. */
    private Context baseContext() {
        Context ctx = new Context();
        ctx.setVariable("currentYear", Year.now().getValue());
        ctx.setVariable("organizationName", ORG_NAME);
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
    }

    /** Writes the rendered HTML to target/email-previews/{name}.html. */
    private void writePreview(String name, String html) throws IOException {
        Path file = OUTPUT_DIR.resolve(name + ".html");
        Files.writeString(file, html);
        System.out.println("  -> Preview written: " + file.toAbsolutePath());
    }
}
