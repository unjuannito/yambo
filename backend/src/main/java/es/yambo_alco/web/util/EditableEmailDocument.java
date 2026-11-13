package es.yambo_alco.web.util;

import org.jsoup.Jsoup;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Explicit marker distinguishes complete editable emails from legacy body-only overrides. */
public final class EditableEmailDocument {
    private EditableEmailDocument() {}

    public static boolean ownsLayout(String html) {
        return html != null && !Jsoup.parseBodyFragment(html).select("[data-yambo-email-document=v1]").isEmpty();
    }

    public static String section(String name) {
        if (!name.equals("header") && !name.equals("footer")) throw new IllegalArgumentException("Unknown email section");
        try (var in = EditableEmailDocument.class.getResourceAsStream("/templates/emails/editor/" + name + ".html")) {
            if (in == null) throw new IllegalStateException("Missing editable email section " + name);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) { throw new IllegalStateException(e); }
    }

    public static String initialBody(String key) {
        if (!key.matches("[a-z0-9-]+")) throw new IllegalArgumentException("Unknown template key");
        try (var in = EditableEmailDocument.class.getResourceAsStream("/db/changelog/changes/109-import-data/" + key + ".html")) {
            if (in == null) throw new IllegalStateException("Missing email template " + key);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) { throw new IllegalStateException(e); }
    }

    public static java.util.List<java.util.Map<String, String>> propertiesFor(String key) {
        if (key.equals("automatic-header")) return java.util.List.of(
                property("headerTitle", "Título", "text", "Notificación"),
                property("headerColor", "Color de fondo", "color", "#2c3e50"),
                property("emailDate", "Fecha", "text", ""));
        if (key.equals("automatic-footer")) return java.util.List.of(
                property("organizationName", "Organización", "text", "Yambo"),
                property("preferencesUrl", "Enlace de preferencias", "url", ""),
                property("currentYear", "Año", "text", "2026"));
        return java.util.List.of();
    }

    private static java.util.Map<String, String> property(String key, String label, String type, String fallback) {
        return java.util.Map.of("key", key, "label", label, "type", type, "defaultValue", fallback);
    }

    private static String component(String key, String name, String html) {
        var properties = propertiesFor(key);
        var values = new java.util.LinkedHashMap<String, Object>();
        properties.forEach(p -> values.put(p.get("key"), java.util.Map.of("mode", "expression", "value", p.get("key"))));
        try {
            var json = new com.fasterxml.jackson.databind.ObjectMapper();
            return "<div data-ee-component=\"" + key + "\" data-ee-component-name=\"" + name
                    + "\" data-ee-component-values=\"" + org.jsoup.nodes.Entities.escape(json.writeValueAsString(values)).replace("\"", "&quot;")
                    + "\" data-ee-component-properties=\"" + org.jsoup.nodes.Entities.escape(json.writeValueAsString(properties)).replace("\"", "&quot;") + "\">" + html + "</div>";
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    public static String wrap(String body) {
        if (body == null || body.isBlank() || ownsLayout(body)) return body;
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
