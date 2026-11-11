package es.yambo_alco.web.service;

import es.yambo_alco.web.service.MailService.OrderProductInfo;
import es.yambo_alco.web.util.EmailHtmlSanitizer;
import es.yambo_alco.web.util.EmailTemplateCatalog;
import es.yambo_alco.web.util.HtmlInliner;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Renderiza los cuerpos de correo compuestos (issue #123).
 * <p>
 * Un cuerpo de personalización o un comunicado se guardan como <b>HTML</b>
 * escrito con el editor de texto enriquecido del admin, con placeholders
 * {@code {{token}}} amigables dentro del texto. En el momento de renderizar:
 * <ol>
 *   <li>el HTML se sanea contra la lista blanca de correo
 *       ({@link EmailHtmlSanitizer}): se conservan estilos en línea y se
 *       eliminan scripts, iframes, eventos y URLs peligrosas;</li>
 *   <li>el token implícito {@code {{boton}}} se sustituye por un botón CTA que
 *       enlaza al enlace principal del correo;</li>
 *   <li>el resto de {@code {{token}}} se resuelven a su valor real (los valores
 *       complejos — productos, fechas, importes — se convierten a HTML/texto);</li>
 *   <li>el resultado se envuelve en el documento de marca (cabecera con el nombre
 *       de la asociación y pie de preferencias).</li>
 * </ol>
 * El mismo render sirve para el envío real (variables del correo) y para la vista
 * previa del admin (valores de ejemplo del {@link EmailTemplateCatalog}).
 * <p>
 * El HTML <b>no</b> se interpreta como Thymeleaf, por lo que no se puede romper el
 * motor ni inyectar plantillado.
 */
@Service
@RequiredArgsConstructor
public class EmailRenderer {

    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("d MMMM yyyy, HH:mm", new Locale("es"));

    private final SettingsService settingsService;

    // ── Personalización de correos automáticos ───────────────────────────

    /**
     * Renderiza un cuerpo de personalización.
     *
     * @param key      clave de la plantilla (p. ej. {@code invitation}); debe ser conocida
     * @param bodyHtml el cuerpo HTML del editor (con {@code {{token}}})
     * @param varNameValues mapa varName→valor: las variables Thymeleaf del correo en
     *                      producción, o los valores de ejemplo del catálogo en la vista previa
     * @return el cuerpo HTML saneado («a pelo», sin envoltorio)
     */
    public String renderBody(String key, String bodyHtml, Map<String, Object> varNameValues) {
        EmailTemplateCatalog.TemplateDef def = EmailTemplateCatalog.byKey(key);

        // 1) saneado del HTML del editor (lista blanca de correo) + fotos subidas a /uploads
        //    con URL absoluta (el correo se abre sin el origen de la app)
        String html = EmailHtmlSanitizer.sanitize(bodyHtml);
        html = EmailHtmlSanitizer.absolutizeUploadSrcs(html, settingsService.getDomain());

        // 2) botón {{boton}} → CTA con el enlace principal (se inserta tras el
        //    saneado: el CTA es HTML generado, no del usuario)
        if (def != null && def.primaryLinkToken() != null) {
            EmailTemplateCatalog.TokenDef primary = findToken(def, def.primaryLinkToken());
            if (primary != null) {
                Object link = varNameValues == null ? null : varNameValues.get(primary.varName());
                String linkStr = link == null ? "" : String.valueOf(link);
                if (!linkStr.isBlank()) {
                    html = html.replace("{{" + EmailTemplateCatalog.BOTON_TOKEN + "}}",
                            ctaButton(linkStr, primary.label()));
                } else {
                    html = html.replace("{{" + EmailTemplateCatalog.BOTON_TOKEN + "}}", "");
                }
            }
        }

        // 3) resolver el resto de {{token}} a sus valores
        return HtmlInliner.resolveTokens(html, tokenValues(def, varNameValues));
    }

    /** Resuelve los tokens en un asunto de personalización (mismo mapa). */
    public String renderSubject(String key, String subject, Map<String, Object> varNameValues) {
        if (subject == null) {
            return subject;
        }
        return HtmlInliner.resolveTokens(subject, tokenValues(EmailTemplateCatalog.byKey(key), varNameValues)).trim();
    }

    // ── Sanitización compartida (comunicados) ─────────────────────────────

    /**
     * Sanea un cuerpo HTML de correo: aplica la lista blanca de correo y deja el
     * HTML «a pelo». Punto de entrada único para todo el HTML compuesto que se
     * envía (personalización y comunicados).
     *
     * @param bodyHtml cuerpo HTML del editor (con o sin {@code {{token}}})
     * @return HTML saneado «a pelo»
     */
    public String sanitizeAndInline(String bodyHtml) {
        String html = EmailHtmlSanitizer.sanitize(bodyHtml);
        return EmailHtmlSanitizer.absolutizeUploadSrcs(html, settingsService.getDomain());
    }

    /**
     * Envuelve un cuerpo HTML ya saneado en el documento de marca (cabecera con
     * el nombre de la asociación y pie de preferencias). Lo usan la
     * personalización, el envío de comunicados y la vista previa.
     *
     * @param sanitizedBody cuerpo HTML ya saneado
     * @return documento HTML completo
     */
    public String envelope(String sanitizedBody) {
        return envelope(sanitizedBody, settingsService.getOrganizationName(),
                settingsService.getDomain() + "/mi-espacio/cuenta");
    }

    /**
     * Renderiza el cuerpo de un comunicado (issue #123): sanea el HTML del
     * editor (lista blanca de correo) y lo envuelve en el documento de marca.
     *
     * @param bodyHtml cuerpo HTML del comunicado
     * @return documento HTML completo, listo para enviar
     */
    public String renderCampaignBody(String bodyHtml) {
        return envelope(sanitizeAndInline(bodyHtml));
    }

    // ── helpers ───────────────────────────────────────────────────────────

    /** Construye el mapa token→valor (incluye {@code {{organizacion}}}). */
    private Map<String, Object> tokenValues(EmailTemplateCatalog.TemplateDef def,
                                            Map<String, Object> varNameValues) {
        Map<String, Object> values = new LinkedHashMap<>();
        if (def != null) {
            for (EmailTemplateCatalog.TokenDef t : def.tokens()) {
                values.put(t.token(), formatValue(varNameValues == null ? null : varNameValues.get(t.varName())));
            }
        }
        values.put("organizacion", settingsService.getOrganizationName());
        return values;
    }

    private EmailTemplateCatalog.TokenDef findToken(EmailTemplateCatalog.TemplateDef def, String tokenName) {
        for (EmailTemplateCatalog.TokenDef t : def.tokens()) {
            if (t.token().equals(tokenName)) {
                return t;
            }
        }
        return null;
    }

    /** Convierte un valor de variable al texto/HTML que se inserta en el cuerpo. */
    private String formatValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof LocalDateTime ldt) {
            return ldt.format(DATE);
        }
        if (value instanceof BigDecimal bd) {
            return bd.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',') + " €";
        }
        if (value instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof OrderProductInfo) {
            return productsTable((List<OrderProductInfo>) list);
        }
        // Strings (incluidos los ya HTML: descriptionHtml, commentHtml, threadHtml) y
        // otros valores se insertan como están.
        return String.valueOf(value);
    }

    private String productsTable(List<OrderProductInfo> products) {
        StringBuilder sb = new StringBuilder();
        sb.append("<table style=\"border-collapse:collapse;width:100%;margin:12px 0;font-size:14px;\">");
        sb.append("<thead><tr>");
        sb.append(cell("Producto", "#f2f2f2", true));
        sb.append(cell("Cant.", "#f2f2f2", true));
        sb.append(cell("Precio", "#f2f2f2", true));
        sb.append("</tr></thead><tbody>");
        for (OrderProductInfo p : products) {
            sb.append("<tr>");
            sb.append(cell(p.name() + (p.configuration() == null || p.configuration().isBlank()
                    ? "" : " (" + p.configuration() + ")"), null, false));
            sb.append(cell(String.valueOf(p.quantity()), null, false));
            sb.append(cell(p.price() == null ? ""
                    : p.price().setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',') + " €", null, false));
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");
        return sb.toString();
    }

    private String cell(String text, String bg, boolean isHeader) {
        String style = "border:1px solid #ddd;padding:8px 12px;text-align:left;"
                + (bg != null ? "background-color:" + bg + ";" : "")
                + (isHeader ? "font-weight:bold;" : "");
        return "<td style=\"" + style + "\">" + (text == null ? "" : text) + "</td>";
    }

    private String ctaButton(String link, String label) {
        return "<table style=\"margin:20px 0;\"><tr><td align=\"center\">"
                + "<a href=\"" + link + "\" style=\"display:inline-block;background-color:#3498db;"
                + "color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;"
                + "font-size:15px;font-weight:bold;\">" + (label == null ? "Abrir" : label) + "</a>"
                + "</td></tr></table>";
    }

    private String envelope(String body, String orgName, String prefsUrl) {
        String header = "<div style=\"background-color:#2c3e50;padding:16px 30px;\">"
                + "<span style=\"color:#ffffff;font-size:18px;font-weight:bold;font-family:Arial,sans-serif;\">"
                + escape(orgName) + "</span></div>";
        String footer = "<div style=\"padding:16px 30px;border-top:1px solid #eaeaea;\">"
                + "<p style=\"margin:0 0 6px 0;color:#999999;font-size:12px;font-family:Arial,sans-serif;\">"
                + "Has recibido este correo de " + escape(orgName) + ".</p>"
                + "<p style=\"margin:0;color:#3498db;font-size:12px;font-family:Arial,sans-serif;\">"
                + "<a href=\"" + prefsUrl + "\" style=\"color:#3498db;\">Gestionar preferencias de notificación</a></p>"
                + "</div>";

        return "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>"
                + "<body style=\"margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f4f4f4;padding:20px;\">"
                + "<tr><td align=\"center\">"
                + "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;\">"
                + header
                + "<tr><td style=\"padding:30px;\">" + body + "</td></tr>"
                + footer
                + "</table></td></tr></table>"
                + "</body></html>";
    }

    private String escape(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
