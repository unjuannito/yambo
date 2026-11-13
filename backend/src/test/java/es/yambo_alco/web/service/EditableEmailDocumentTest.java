package es.yambo_alco.web.service;

import es.yambo_alco.web.util.EditableEmailDocument;
import es.yambo_alco.web.util.EmailTemplateCatalog;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.jsoup.Jsoup;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import static org.junit.jupiter.api.Assertions.*;

class EditableEmailDocumentTest {
    @Test
    void wrapsLegacyBodyOnceAndKeepsItsContent() {
        String invitation = EditableEmailDocument.initialBody("invitation");
        assertTrue(invitation.contains("¡Has sido invitado!"));
        assertTrue(invitation.contains("botón"));
        assertFalse(invitation.contains("Â¡"));
        String body = "<p>Contenido personalizado</p>";
        String full = EditableEmailDocument.wrap(body);
        assertTrue(EditableEmailDocument.ownsLayout(full));
        assertEquals(full, EditableEmailDocument.wrap(full));
        var doc = Jsoup.parseBodyFragment(full);
        assertEquals(1, doc.select("[data-ee-component=automatic-header]").size());
        assertEquals(1, doc.select("[data-ee-component=automatic-footer]").size());
        assertTrue(full.contains(body));
        assertFalse(EditableEmailDocument.ownsLayout("<!-- data-yambo-email-document=\"v1\" --><p>Cuerpo</p>"));
    }

    @Test
    void rendersEveryImportedDocumentWithExactlyOneHeaderAndFooter() throws Exception {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1); executor.initialize();
        try {
            var engine = new ThymeleafEmailEngine(executor);
            for (var def : EmailTemplateCatalog.all()) {
                String body;
                try (var input = getClass().getResourceAsStream("/db/changelog/changes/109-import-data/" + def.key() + ".html")) {
                    assertNotNull(input, def.key()); body = new String(input.readAllBytes(), StandardCharsets.UTF_8);
                }
                assertTrue(EditableEmailDocument.ownsLayout(body), def.key());
                var vars = new HashMap<String, Object>(def.sampleVariables());
                vars.put("currentYear", 2026); vars.put("organizationName", "Yambo");
                vars.put("preferencesUrl", "https://yambo.example/preferences"); vars.put("emailDate", "12/11/2026 12:00");
                String rendered = engine.renderOrFallback(body, vars);
                assertNotNull(rendered, "Render failed: " + def.key());
                var output = java.nio.file.Path.of("target/editable-email-previews");
                java.nio.file.Files.createDirectories(output);
                java.nio.file.Files.writeString(output.resolve(def.key() + ".html"), EditableEmailDocument.renderedDocument(rendered), StandardCharsets.UTF_8);
                var doc = Jsoup.parseBodyFragment(rendered);
                assertEquals(1, doc.select("[data-ee-component=automatic-header]").size(), def.key());
                assertEquals(1, doc.select("[data-ee-component=automatic-footer]").size(), def.key());
                assertFalse(rendered.contains("th:text"), def.key());
            }
        } finally { executor.shutdown(); }
    }
}
