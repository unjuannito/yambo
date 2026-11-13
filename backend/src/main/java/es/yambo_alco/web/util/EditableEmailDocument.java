package es.yambo_alco.web.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Entities;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Explicit marker distinguishes complete editable emails from legacy body-only overrides. */
public final class EditableEmailDocument {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String RESOURCE_ROOT = "/templates/emails/editor/";
    private static final List<Map<String, String>> HEADER_PROPERTIES = List.of(
            property("headerTitle", "Título", "text", "Notificación"),
            property("headerColor", "Color de fondo", "color", "#2c3e50"),
            property("emailDate", "Fecha", "text", ""));
    private static final List<Map<String, String>> FOOTER_PROPERTIES = List.of(
            property("organizationName", "Organización", "text", "Yambo"),
            property("preferencesUrl", "Enlace de preferencias", "url", ""),
            property("currentYear", "Año", "text", "2026"));

    private EditableEmailDocument() {}

    public static boolean ownsLayout(String html) {
        return html != null && !Jsoup.parseBodyFragment(html).select("[data-yambo-email-document=v1]").isEmpty();
    }

    public static String section(String name) {
        if (!name.equals("header") && !name.equals("footer")) {
            throw new IllegalArgumentException("Unknown email section");
        }
        return readResource(RESOURCE_ROOT + name + ".html", "editable email section " + name);
    }

    public static String initialBody(String key) {
        if (!key.matches("[a-z0-9-]+")) {
            throw new IllegalArgumentException("Unknown template key");
        }
        return readResource("/db/changelog/changes/109-import-data/" + key + ".html", "email template " + key);
    }

    private static String readResource(String path, String description) {
        try (var input = EditableEmailDocument.class.getResourceAsStream(path)) {
            if (input == null) {
                throw new IllegalStateException("Missing " + description);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public static List<Map<String, String>> propertiesFor(String key) {
        return switch (key) {
            case "automatic-header" -> HEADER_PROPERTIES;
            case "automatic-footer" -> FOOTER_PROPERTIES;
            default -> List.of();
        };
    }

    private static Map<String, String> property(String key, String label, String type, String fallback) {
        return Map.of("key", key, "label", label, "type", type, "defaultValue", fallback);
    }

    private static String jsonAttribute(Object value) {
        try {
            return Entities.escape(JSON.writeValueAsString(value)).replace("\"", "&quot;");
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String component(String key, String name, String html) {
        List<Map<String, String>> properties = propertiesFor(key);
        Map<String, Object> values = new LinkedHashMap<>();
        properties.forEach(property -> values.put(property.get("key"),
                Map.of("mode", "expression", "value", property.get("key"))));
        return "<div data-ee-component=\"" + key + "\" data-ee-component-name=\"" + name
                + "\" data-ee-component-values=\"" + jsonAttribute(values)
                + "\" data-ee-component-properties=\"" + jsonAttribute(properties) + "\">" + html + "</div>";
    }

    public static String wrap(String body) {
        if (body == null || body.isBlank() || ownsLayout(body)) {
            return body;
        }
        return "<div data-yambo-email-document=\"v1\" aria-label=\"Correo completo\" style=\"width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;\">"
                + component("automatic-header", "Cabecera del correo", section("header"))
                + "<div aria-label=\"Contenido del correo\" style=\"padding:40px 30px;\">" + body + "</div>"
                + component("automatic-footer", "Pie del correo", section("footer")) + "</div>";
    }

    /** Input has already passed through EmailRenderer's sanitizer. */
    public static String renderedDocument(String sanitized) {
        return "<!doctype html><html lang=\"es\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>"
                + "<body style=\"margin:0;padding:20px;background-color:#f4f4f4;font-family:Arial,sans-serif;\">" + sanitized + "</body></html>";
    }
}
