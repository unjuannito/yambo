package es.yambo_alco.web.service;

import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests de {@link ThymeleafEmailEngine}: el motor en sí (sin mockear), para
 * fijar en un test lo que ya se verificó a mano antes de escribir la clase
 * (ver el javadoc de la clase) — que el aislamiento de seguridad se mantiene
 * si alguien toca la configuración del motor más adelante.
 */
class ThymeleafEmailEngineTest {

    private final ThymeleafEmailEngine engine = new ThymeleafEmailEngine(newExecutor());

    private static ThreadPoolTaskExecutor newExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.initialize();
        return executor;
    }

    @Test
    void isThymeleafMode_DetectsThAttributes() {
        assertTrue(ThymeleafEmailEngine.isThymeleafMode("<p th:text=\"${x}\"></p>"));
        assertTrue(ThymeleafEmailEngine.isThymeleafMode("<div th:each=\"p : ${products}\"></div>"));
        assertFalse(ThymeleafEmailEngine.isThymeleafMode("<p>Hola {{nombre}}</p>"));
        assertFalse(ThymeleafEmailEngine.isThymeleafMode(null));
    }

    @Test
    void isThymeleafMode_IgnoresInlineCssWidthDeclarations() {
        // Regresión: "th:" aparece dentro de "width:"/"max-width:" (CSS en línea de
        // todos los correos planos), no debe disparar el motor por error.
        assertFalse(ThymeleafEmailEngine.isThymeleafMode(
                "<table style=\"width:100%;max-width:600px;\"><tr><td>Hola</td></tr></table>"));
    }

    @Test
    void renderOrFallback_ResolvesVariablesAndLoops() {
        String body = "<ul><li th:each=\"p : ${products}\" th:text=\"${p}\">x</li></ul>"
                + "<p th:if=\"${nombre != null}\" th:text=\"'Hola ' + ${nombre}\"></p>";

        String result = engine.renderOrFallback(body, Map.of(
                "products", List.of("Camiseta", "Gorra"),
                "nombre", "Ana"));

        assertNotNull(result);
        assertTrue(result.contains("Camiseta"), "el bucle se resuelve: " + result);
        assertTrue(result.contains("Gorra"), "el bucle se resuelve: " + result);
        assertTrue(result.contains("Hola Ana"), "la variable se resuelve: " + result);
    }

    @Test
    void renderOrFallback_ResolvesTheWhitelistedSharedFragment() {
        String body = "<table>"
                + "<th:block th:replace=\"~{emails/fragments/layout :: header('#2563eb', '', 'Hola')}\"/>"
                + "</table>";

        String result = engine.renderOrFallback(body, Map.of());

        assertNotNull(result);
        assertTrue(result.contains("Hola"), "el fragmento compartido se resuelve: " + result);
        assertTrue(result.contains("#2563eb"), "con los parámetros pasados: " + result);
    }

    @Test
    void renderOrFallback_CannotReachAnyOtherServerFile() {
        // Nombre de plantilla fuera de emails/fragments/: no debe resolver ningún
        // fichero real del classpath ni del disco (cae al resolutor de cadena,
        // que lo trata como texto literal y no produce el fragmento real).
        String body = "<div th:replace=\"~{emails/activity-open-registration}\"></div>";

        String result = engine.renderOrFallback(body, Map.of());

        assertNotNull(result, "no debe fallar ni colgarse, solo no resolver nada útil");
        assertFalse(result.contains("Inscripciones abiertas"),
                "no debe poder cargar otra plantilla real del servidor: " + result);
    }

    @Test
    void renderOrFallback_BlocksClassicSpelSandboxEscapes() {
        // Regresión de la revisión de seguridad hecha antes de construir este motor:
        // T(...), reflexión y new Runtime/File/URL deben seguir bloqueados por el
        // propio SpringEL de Thymeleaf (no implementamos nosotros esta protección).
        assertNull(engine.renderOrFallback("<p th:text=\"${T(java.lang.System).getProperty('user.name')}\"></p>", Map.of()));
        assertNull(engine.renderOrFallback("<p th:text=\"${new java.io.File('.').getAbsolutePath()}\"></p>", Map.of()));
        assertNull(engine.renderOrFallback("<p th:text=\"${new java.net.URL('http://169.254.169.254/').openConnection()}\"></p>", Map.of()));
    }

    @Test
    void renderOrFallback_PlainHtmlWithoutThymeleafPassesThrough() {
        String result = engine.renderOrFallback("<p>Hola {{nombre}}</p>", Map.of());

        assertEquals("<p>Hola {{nombre}}</p>", result);
    }
}
