package es.yambo_alco.web.util;

import es.yambo_alco.web.service.CampaignRecipient;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

public final class CampaignVariables {
    private CampaignVariables() {}
    public record Variable(String token, String varName, String label, Object sample) {}
    public static final CampaignRecipient SAMPLE = new CampaignRecipient("SOCIO-DEMO", "Lucía Martín", "lucia@example.com");
    private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([\\w.]+)\\s*}}|\\$\\{\\s*([\\w.]+)\\s*}");
    public static LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Europe/Madrid")); }
    private static String text(String value) { return value == null ? "" : value; }
    public static Map<String, Object> values(CampaignRecipient recipient, String organization, String domain, LocalDateTime now) {
        var r = recipient == null ? SAMPLE : recipient;
        String name = r.name() == null || r.name().isBlank() ? text(r.email()) : r.name().strip();
        String email = text(r.email());
        String date = now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String time = now.format(DateTimeFormatter.ofPattern("HH:mm"));
        String preferences = text(domain) + "/mi-espacio/cuenta";
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("nombre", name); map.put("primerNombre", name.isEmpty() ? "" : name.split("\\s+", 2)[0]);
        map.put("usuario", email); map.put("email", email); map.put("userId", text(r.userId()));
        map.put("fecha", date); map.put("hora", time); map.put("fechaHora", date + " " + time); map.put("anio", now.getYear());
        map.put("organizacion", text(organization)); map.put("dominio", text(domain));
        map.put("destinatario", Map.of("id", text(r.userId()), "nombre", name, "usuario", email, "email", email));
        map.put("organizationName", text(organization)); map.put("preferencesUrl", preferences); map.put("enlace_preferencias", preferences);
        map.put("currentYear", now.getYear()); map.put("emailDate", date + " " + time);
        map.put("headerTitle", "Comunicado"); map.put("headerColor", "#2c3e50"); map.put("headerIcon", "");
        return map;
    }
    public static List<Variable> catalog(Map<String, Object> values) {
        String[][] labels = {{"nombre","Nombre completo"},{"primerNombre","Primer nombre"},{"usuario","Usuario (email de acceso)"},{"email","Email"},{"userId","ID del socio"},{"fecha","Fecha de envío"},{"hora","Hora de envío"},{"fechaHora","Fecha y hora"},{"anio","Año"},{"organizacion","Nombre de la organización"},{"dominio","Dominio"},{"destinatario","Datos del destinatario"},{"preferencesUrl","Enlace de preferencias"}};
        return Arrays.stream(labels).map(pair -> new Variable("{{" + pair[0] + "}}", pair[0], pair[1], values.get(pair[0]))).toList();
    }
    public static String replace(String source, Map<String, Object> values) {
        if (source == null) return "";
        var matcher = TOKEN.matcher(source); var output = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            Object value = values;
            for (String part : key.split("\\.")) value = value instanceof Map<?, ?> map ? map.get(part) : null;
            matcher.appendReplacement(output, java.util.regex.Matcher.quoteReplacement(value == null ? "" : String.valueOf(value)));
        }
        matcher.appendTail(output); return output.toString();
    }
    /** Replace only text and ordinary display attributes, never Thymeleaf expressions or editor metadata. */
    public static String resolveHtml(String source, Map<String, Object> values) {
        if (source == null) return "";
        var doc = org.jsoup.Jsoup.parseBodyFragment(source); boolean changed = false;
        for (var element : doc.getAllElements()) {
            for (var node : element.textNodes()) {
                String old = node.getWholeText(), next = replace(old, values);
                if (!old.equals(next)) { node.text(next); changed = true; }
            }
            for (String attr : List.of("href", "src", "title", "alt", "style")) {
                if (!element.hasAttr(attr)) continue;
                String old = element.attr(attr), next = replace(old, values);
                if (!old.equals(next)) { element.attr(attr, next); changed = true; }
            }
        }
        return changed ? doc.body().html() : source;
    }
}
