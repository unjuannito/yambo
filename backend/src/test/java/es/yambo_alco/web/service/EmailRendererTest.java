package es.yambo_alco.web.service;

import es.yambo_alco.web.service.MailService.OrderProductInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Tests de {@link EmailRenderer}: el pipeline HTML del editor → saneado
 * (lista blanca de correo) → tokens → envoltorio de marca.
 */
@ExtendWith(MockitoExtension.class)
class EmailRendererTest {

    @Mock
    private SettingsService settingsService;

    @Mock
    private ThymeleafEmailEngine thymeleafEmailEngine;

    @InjectMocks
    private EmailRenderer renderer;

    @BeforeEach
    void setUp() {
        lenient().when(settingsService.getOrganizationName()).thenReturn("Asociación Prueba");
        lenient().when(settingsService.getDomain()).thenReturn("https://yambo.example");
    }

    @Test
    void renderBody_ShouldResolveTokensAndButton() {
        Map<String, Object> vars = Map.of(
                "userName", "Ana",
                "orderId", "999",
                "statusLabel", "PAGO CONFIRMADO",
                "orderUrl", "https://yambo.example/pedido/999");

        String html = renderer.renderBody("order-confirmed",
                "<p>Hola {{nombre}}, tu pedido {{pedido}} está {{estado}}. {{boton}}</p>", vars);

        assertTrue(html.contains("Ana"), "el token de nombre se resuelve: " + html);
        assertTrue(html.contains("999"), "el token de pedido se resuelve");
        assertTrue(html.contains("PAGO CONFIRMADO"), "el token de estado se resuelve");
        assertFalse(html.contains("{{boton}}"), "el botón se sustituye: " + html);
        assertTrue(html.contains("href=\"https://yambo.example/pedido/999\""),
                "el botón enlaza al enlace principal: " + html);
        assertTrue(html.contains("Ver pedido"), "el botón usa la etiqueta del token");
        assertFalse(html.contains("{{nombre}}"), "no quedan tokens sin resolver");
    }

    @Test
    void renderBody_WithoutLink_ShouldDropTheButton() {
        Map<String, Object> vars = Map.of("userName", "Ana");

        String html = renderer.renderBody("order-confirmed",
                "<p>Hola {{nombre}}. {{boton}}</p>", vars);

        assertFalse(html.contains("{{boton}}"));
        assertTrue(html.contains("Ana"));
    }

    @Test
    void renderBody_ShouldFormatComplexValuesAsHtml() {
        List<OrderProductInfo> products = List.of(
                new OrderProductInfo("Camiseta", 2, new BigDecimal("10.00"), "Talla M"));
        Map<String, Object> vars = Map.of(
                "products", products,
                "totalPrice", new BigDecimal("28.50"));

        String html = renderer.renderBody("order-confirmed",
                "{{productos}} Total: {{total}}", vars);

        assertTrue(html.contains("Camiseta"), "la tabla de productos se renderiza: " + html);
        assertTrue(html.contains("28,50 €"), "el importe se formatea en euros: " + html);
    }

    @Test
    void renderBody_ShouldStripScriptsFromEditorHtml() {
        String html = renderer.renderBody("order-confirmed",
                "<p>Hola</p><script>alert('xss')</script><p onclick=\"steal()\">{{nombre}}</p>",
                Map.of("userName", "Ana"));

        assertFalse(html.contains("<script"), "los scripts se eliminan: " + html);
        assertFalse(html.contains("alert"), "no queda el payload: " + html);
        assertFalse(html.contains("onclick"), "los manejadores de evento se eliminan: " + html);
        assertTrue(html.contains("Ana"), "el contenido legítimo se conserva");
    }

    @Test
    void renderSubject_ShouldResolveTokens() {
        String subject = renderer.renderSubject("order-confirmed",
                "Tu pedido {{pedido}} está pagado", Map.of("orderId", "999"));

        assertEquals("Tu pedido 999 está pagado", subject);
    }

    @Test
    void renderSubject_Null_ShouldReturnNull() {
        assertNull(renderer.renderSubject("order-confirmed", null, Map.of()));
    }

    @Test
    void renderCampaignBody_ShouldReturnFullBrandedDocument() {
        String doc = renderer.renderCampaignBody("<h2>Hola socios</h2><p>Novedad.</p>");

        assertTrue(doc.startsWith("<!DOCTYPE html>"), "documento completo: " + doc.substring(0, 40));
        assertTrue(doc.contains("Asociación Prueba"), "cabecera con el nombre de la asociación");
        assertTrue(doc.contains("Gestionar preferencias"), "pie con el enlace de preferencias");
        assertTrue(doc.contains("https://yambo.example/mi-espacio/cuenta"), "el pie enlaza a la cuenta");
        assertTrue(doc.contains("<h2>Hola socios</h2>"), "el HTML del editor se conserva: " + doc);
    }

    @Test
    void sanitizeAndInline_ShouldApplyTheEmailSafelist() {
        assertEquals("<p><strong>hola</strong></p>", renderer.sanitizeAndInline("<p><strong>hola</strong></p>"));
    }

    @Test
    void sanitizeAndInline_ShouldDropDangerousContent() {
        String out = renderer.sanitizeAndInline(
                "<p>ok</p><iframe src=\"https://evil.example\"></iframe>"
                        + "<a href=\"javascript:alert(1)\">peligro</a>");

        assertFalse(out.contains("<iframe"), "los iframes se eliminan: " + out);
        assertFalse(out.contains("javascript:"), "las URLs javascript: se eliminan: " + out);
        assertTrue(out.contains("<p>ok</p>"));
    }

    @Test
    void renderBody_ThymeleafMode_UsesEngineResultWhenRenderSucceeds() {
        when(thymeleafEmailEngine.renderOrFallback(eq("<p th:text=\"${nombre}\"></p>"), anyMap()))
                .thenReturn("<p>Ana</p>");

        String html = renderer.renderBody("order-confirmed", "<p th:text=\"${nombre}\"></p>", Map.of("nombre", "Ana"));

        assertTrue(html.contains("Ana"), "usa el resultado del motor Thymeleaf: " + html);
        verify(thymeleafEmailEngine).renderOrFallback(anyString(), anyMap());
    }

    @Test
    void renderBody_ThymeleafMode_FallsBackToPlainWhenEngineFails() {
        when(thymeleafEmailEngine.renderOrFallback(anyString(), anyMap())).thenReturn(null);

        String html = renderer.renderBody("order-confirmed",
                "<p th:text=\"${nombre}\">placeholder</p>", Map.of("nombre", "Ana"));

        assertFalse(html.contains("th:text"), "los atributos th:* se quitan en el degradado: " + html);
        assertTrue(html.contains("placeholder"), "se conserva el contenido tal cual, sin resolver: " + html);
    }

    @Test
    void sanitizeAndInline_ThymeleafMode_OnlyPassesOrganizationLevelVariables() {
        when(settingsService.getOrganizationName()).thenReturn("Asociación Prueba");
        when(thymeleafEmailEngine.renderOrFallback(anyString(), anyMap())).thenReturn("<p>ok</p>");

        renderer.sanitizeAndInline("<p th:text=\"${organizacion}\"></p>");

        ArgumentCaptor<Map<String, Object>> varsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(thymeleafEmailEngine).renderOrFallback(anyString(), varsCaptor.capture());
        assertEquals("Asociación Prueba", varsCaptor.getValue().get("organizacion"));
        assertEquals("https://yambo.example", varsCaptor.getValue().get("dominio"));
    }

    @Test
    void renderBody_PlainMode_NeverCallsTheThymeleafEngine() {
        renderer.renderBody("order-confirmed", "<p>Hola {{nombre}}</p>", Map.of("userName", "Ana"));

        verifyNoInteractions(thymeleafEmailEngine);
    }

    @Test
    void renderBody_ShouldKeepAndAbsolutizeUploadedImages() {
        String html = renderer.renderBody("order-confirmed",
                "<p>Hola</p><img src=\"/uploads/foto.jpg\" alt=\"foto\">", Map.of());

        assertTrue(html.contains("src=\"https://yambo.example/uploads/foto.jpg\""),
                "la imagen subida se mantiene con URL absoluta (el correo no tiene el origen de la app): " + html);
    }

    @Test
    void sanitizeAndInline_ShouldKeepAndAbsolutizeUploadedImages() {
        String out = renderer.sanitizeAndInline("<p>Hola</p><img src=\"/uploads/foto.jpg\" alt=\"foto\">");

        assertTrue(out.contains("src=\"https://yambo.example/uploads/foto.jpg\""),
                "mismo comportamiento para comunicados: " + out);
    }

    @Test
    void sanitizeAndInline_ShouldStillDropUnsafeRelativeImageSrcs() {
        String out = renderer.sanitizeAndInline("<img src=\"/etc/passwd\" alt=\"x\">");

        assertFalse(out.contains("src="), "solo /uploads/... se admite como ruta relativa: " + out);
    }

    @Test
    void sanitizeAndInline_ShouldKeepTokensForLaterResolution() {
        String out = renderer.sanitizeAndInline("<p>Hola {{nombre}}, saluda a {{organizacion}}</p>");

        assertTrue(out.contains("{{nombre}}"), "los tokens de texto sobreviven al saneado: " + out);
        assertTrue(out.contains("{{organizacion}}"));
    }

    @Test
    void envelope_ShouldEscapeOrgName() {
        when(settingsService.getOrganizationName()).thenReturn("A<B>");

        String doc = renderer.envelope("<p>body</p>");

        assertTrue(doc.contains("A&lt;B&gt;"), "el nombre de la asociación se escapa: " + doc);
        assertFalse(doc.contains("A<B>"));
    }
}
