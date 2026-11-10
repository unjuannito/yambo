package es.yambo_alco.web.service;

import es.yambo_alco.web.service.MailService.OrderProductInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Tests de {@link EmailRenderer}: el pipeline markdown → HTML saneado →
 * tokens → envoltorio de marca.
 */
@ExtendWith(MockitoExtension.class)
class EmailRendererTest {

    @Mock
    private MarkdownService markdownService;

    @Mock
    private SettingsService settingsService;

    @InjectMocks
    private EmailRenderer renderer;

    @BeforeEach
    void setUp() {
        // El mock devuelve el markdown «saneado» tal cual: el saneado real es
        // responsabilidad de MarkdownService (ya testado). El renderer se
        // limita a componer HTML.
        lenient().when(markdownService.toSafeHtml(anyString())).thenAnswer(inv -> inv.getArgument(0));
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
                "Hola {{nombre}}, tu pedido {{pedido}} está {{estado}}. {{boton}}", vars);

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

        String html = renderer.renderBody("order-confirmed", "Hola {{nombre}}. {{boton}}", vars);

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
        String doc = renderer.renderCampaignBody("Hola socios, **novedad**.");

        assertTrue(doc.startsWith("<!DOCTYPE html>"), "documento completo: " + doc.substring(0, 40));
        assertTrue(doc.contains("Asociación Prueba"), "cabecera con el nombre de la asociación");
        assertTrue(doc.contains("Gestionar preferencias"), "pie con el enlace de preferencias");
        assertTrue(doc.contains("https://yambo.example/mi-espacio/cuenta"), "el pie enlaza a la cuenta");
    }

    @Test
    void sanitizeAndInline_ShouldDelegateToMarkdownService() {
        when(markdownService.toSafeHtml("**hola**")).thenReturn("<p><strong>hola</strong></p>");

        assertEquals("<p><strong>hola</strong></p>", renderer.sanitizeAndInline("**hola**"));
    }

    @Test
    void envelope_ShouldEscapeOrgName() {
        when(settingsService.getOrganizationName()).thenReturn("A<B>");

        String doc = renderer.envelope("<p>body</p>");

        assertTrue(doc.contains("A&lt;B&gt;"), "el nombre de la asociación se escapa: " + doc);
        assertFalse(doc.contains("A<B>"));
    }
}
