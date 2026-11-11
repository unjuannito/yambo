package es.yambo_alco.web.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

import java.util.List;

/**
 * Sanitizador de HTML para los cuerpos de correo compuestos (issue #123).
 * <p>
 * Los cuerpos de personalización y los comunicados se escriben ahora en el
 * editor de texto enriquecido del admin (TipTap), que produce <b>HTML real</b>
 * (con estilos en línea, no markdown). Antes de enviar o previsualizar, ese HTML
 * se sanea contra una lista blanca pensada para correo:
 * <ul>
 *   <li>etiquetas de texto, listas, enlaces, imágenes, tablas y formato simple;</li>
 *   <li>el atributo {@code style} se conserva (los clientes de correo solo
 *       respetan estilos en línea) y el {@code class} se conserva como inofensivo;</li>
 *   <li>se eliminan por defecto {@code script}, {@code iframe}, {@code object},
 *       {@code form} y cualquier manejador de eventos ({@code on*});</li>
 *   <li>los {@code href}/{@code src} solo aceptan http/https/mailto (se rechazan
 *       {@code javascript:} y similares).</li>
 * </ul>
 * Los placeholders {@code {{token}}} viven en nodos de texto, por lo que el
 * saneado los deja intactos y {@code EmailRenderer} los resuelve después.
 */
public final class EmailHtmlSanitizer {

    private EmailHtmlSanitizer() {
    }

    /** Sanea un fragmento HTML de cuerpo de correo y devuelve el HTML seguro «a pelo». */
    public static String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        String cleaned = Jsoup.clean(html, emailSafelist());
        Document doc = Jsoup.parseBodyFragment(cleaned);
        enforce(doc);
        return doc.body().html();
    }

    /** Lista blanca de etiquetas/atributos apta para el HTML de un editor de correo. */
    public static Safelist emailSafelist() {
        // Partimos de la base de jsoup (p, strong, em, a, ul, ol, li, img, br, hr,
        // blockquote, code, pre) y añadimos lo que produce el editor TipTap.
        Safelist base = Safelist.relaxed();
        base.addTags(
                "h1", "h2", "h3", "h4",
                "table", "thead", "tbody", "tr", "td", "th", "caption", "colgroup", "col",
                "figure", "figcaption",
                "span", "div",
                "del", "ins", "sup", "sub",
                "details", "summary");
        base.addAttributes("a", "href", "title", "target", "rel");
        base.addAttributes("img", "alt", "title");
        base.addAttributes("table", "width", "cellpadding", "cellspacing", "align", "style");
        base.addAttributes("td", "align", "colspan", "rowspan", "width", "style");
        base.addAttributes("th", "align", "colspan", "rowspan", "width", "style");
        base.addAttributes("tr", "align", "style");
        base.addAttributes("span", "style");
        base.addAttributes("div", "align", "style");
        base.addAttributes("p", "style");
        base.addAttributes("h1", "style");
        base.addAttributes("h2", "style");
        base.addAttributes("h3", "style");
        base.addAttributes("h4", "style");
        base.addAttributes("blockquote", "style");
        base.addAttributes("li", "style");
        base.addAttributes("ul", "style");
        base.addAttributes("ol", "style");
        base.addAttributes("hr", "style");
        base.addAttributes("pre", "style");
        base.addAttributes("code", "style");
        base.addAttributes("strong", "style");
        base.addAttributes("em", "style");
        base.addAttributes("del", "style");
        base.addAttributes("ins", "style");
        base.addAttributes("sup", "style");
        base.addAttributes("sub", "style");
        base.addAttributes("figure", "style");
        base.addAttributes("figcaption", "style");
        base.addAttributes("a", "style");
        base.addAttributes("img", "style");
        return base;
    }

    /**
     * Aplica la lista blanca y, además de lo que {@code Jsoup.clean} ya elimina,
     * descarta atributos residuales de eventos ({@code on*}) y enlaces no seguros.
     */
    private static void enforce(Document doc) {
        for (Element el : doc.getAllElements()) {
            List<org.jsoup.nodes.Attribute> toRemove = el.attributes().asList().stream()
                    .filter(a -> a.getKey().toLowerCase().startsWith("on"))
                    .toList();
            for (org.jsoup.nodes.Attribute a : toRemove) {
                el.removeAttr(a.getKey());
            }
            String href = el.attr("href");
            if (!href.isEmpty() && !isSafeUrl(href)) {
                el.removeAttr("href");
            }
            String src = el.attr("src");
            if (!src.isEmpty() && !isSafeUrl(src)) {
                el.removeAttr("src");
            }
        }
    }

    private static boolean isSafeUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String u = url.trim().toLowerCase();
        return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("mailto:");
    }
}
