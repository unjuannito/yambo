package es.yambo_alco.web.util;

import es.yambo_alco.web.service.CampaignRecipient;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Shared source of recipient variables for preview, catalog and delivery. */
public final class CampaignVariables {
    public record Variable(String token, String varName, String label, Object sample) {}
    private record Definition(String name, String label) {}

    public static final CampaignRecipient SAMPLE = new CampaignRecipient("SOCIO-DEMO", "Lucía Martín", "lucia@example.com");
    private static final ZoneId TIME_ZONE = ZoneId.of("Europe/Madrid");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final List<Definition> DEFINITIONS = List.of(
            new Definition("nombre", "Nombre completo"),
            new Definition("primerNombre", "Primer nombre"),
            new Definition("usuario", "Usuario (email de acceso)"),
            new Definition("email", "Email"),
            new Definition("userId", "ID del socio"),
            new Definition("fecha", "Fecha de envío"),
            new Definition("hora", "Hora de envío"),
            new Definition("fechaHora", "Fecha y hora"),
            new Definition("anio", "Año"),
            new Definition("organizacion", "Nombre de la organización"),
            new Definition("dominio", "Dominio"),
            new Definition("destinatario", "Datos del destinatario"),
            new Definition("preferencesUrl", "Enlace de preferencias"));

    private CampaignVariables() {}

    public static LocalDateTime now() {
        return LocalDateTime.now(TIME_ZONE);
    }

    /** Build one snapshot shared by the subject, body and reusable components. */
    public static Map<String, Object> values(CampaignRecipient recipient, String organization,
                                             String domain, LocalDateTime now) {
        Map<String, Object> values = new LinkedHashMap<>();
        addRecipientValues(values, recipient == null ? SAMPLE : recipient);
        addDateValues(values, now);
        values.put("organizacion", text(organization));
        values.put("dominio", text(domain));
        addComponentValues(values);
        return values;
    }

    private static void addRecipientValues(Map<String, Object> values, CampaignRecipient recipient) {
        String email = text(recipient.email());
        String name = recipient.name() == null || recipient.name().isBlank()
                ? email : recipient.name().strip();
        String id = text(recipient.userId());

        values.put("nombre", name);
        values.put("primerNombre", name.isEmpty() ? "" : name.split("\\s+", 2)[0]);
        values.put("usuario", email);
        values.put("email", email);
        values.put("userId", id);
        values.put("destinatario", Map.of(
                "id", id,
                "nombre", name,
                "usuario", email,
                "email", email));
    }

    private static void addDateValues(Map<String, Object> values, LocalDateTime now) {
        String date = now.format(DATE_FORMAT);
        String time = now.format(TIME_FORMAT);
        values.put("fecha", date);
        values.put("hora", time);
        values.put("fechaHora", date + " " + time);
        values.put("anio", now.getYear());
    }

    /** Keep legacy component aliases tied to the same recipient and date snapshot. */
    private static void addComponentValues(Map<String, Object> values) {
        values.put("organizationName", values.get("organizacion"));
        values.put("preferencesUrl", values.get("dominio") + "/mi-espacio/cuenta");
        values.put("enlace_preferencias", values.get("preferencesUrl"));
        values.put("currentYear", values.get("anio"));
        values.put("emailDate", values.get("fechaHora"));
        values.put("headerTitle", "Comunicado");
        values.put("headerColor", "#2c3e50");
        values.put("headerIcon", "");
    }

    public static List<Variable> catalog(Map<String, Object> values) {
        return DEFINITIONS.stream()
                .map(definition -> new Variable("{{" + definition.name() + "}}", definition.name(),
                        definition.label(), values.get(definition.name())))
                .toList();
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }
}
