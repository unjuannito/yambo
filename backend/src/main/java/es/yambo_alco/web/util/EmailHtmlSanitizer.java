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

    /**
     * Degradado seguro cuando el render Thymeleaf de un cuerpo falla o agota el
     * tiempo (issue #123, Part 2): se quitan los atributos {@code th:*} (y se
     * desenvuelve {@code <th:block>}, que es solo agrupación) para que el texto
     * siga siendo HTML válido — queda «tal cual» (p. ej. {@code ${userName}}
     * visible en vez de resuelto), pero el correo se envía igualmente en vez de
     * fallar. El resultado pasa después por {@link #sanitize} como cualquier
     * otro cuerpo.
     */
    public static String stripThymeleafAttributes(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        for (Element el : doc.getAllElements()) {
            List<Attribute> thAttrs = el.attributes().asList().stream()
                    .filter(a -> a.getKey().toLowerCase().startsWith("th:"))
                    .toList();
            for (Attribute a : thAttrs) {
                el.removeAttr(a.getKey());
            }
        }
        for (Element block : doc.select("th\\:block")) {
            block.unwrap();
        }
        return doc.body().html();
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

    /** Editor source keeps supported directives; final rendered output still uses sanitize(). */
    public static String sanitizeTemplate(String html) {
        if (html == null || html.isBlank()) return html;
        Safelist source = new Safelist(emailSafelist()) {
            @Override
            public boolean isSafeAttribute(String tag, Element element, Attribute attribute) {
                return attribute.getKey().startsWith("data-ee-") || super.isSafeAttribute(tag, element, attribute);
            }
        };
        source.addTags("th:block");
        source.addAttributes(":all", "th:text", "th:utext", "th:href", "th:src", "th:style", "th:if", "th:unless", "th:each", "th:with", "th:replace", "th:insert");
        Document doc = Jsoup.parseBodyFragment(Jsoup.clean(html, source));
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
        // relaxed() restricts img src to absolute http(s) only, which would silently drop
        // the relative /uploads/... paths our own upload flow produces before enforce()
        // below even gets a chance to apply its own (upload-aware) URL check.
        base.removeProtocols("img", "src", "http", "https");
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
            if (!href.isEmpty() && !isSafeUrl(href, false)) {
                el.removeAttr("href");
            }
            String src = el.attr("src");
            if (!src.isEmpty() && !isSafeUrl(src, el.tagName().equals("img"))) {
                el.removeAttr("src");
            }
        }
    }

    /**
     * Un {@code /uploads/...} relativo (lo que produce nuestra propia subida de
     * ficheros) solo resuelve dentro de la propia app — en el correo, que se abre
     * sin ese origen, hay que convertirlo a absoluto contra el dominio público.
     * Se aplica tras {@link #sanitize}, ya con el HTML saneado.
     */
    public static String absolutizeUploadSrcs(String html, String domain) {
        if (html == null || html.isBlank() || domain == null || domain.isBlank()) {
            return html;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        for (Element img : doc.select("img[src^=/uploads/]")) {
            img.attr("src", domain + img.attr("src"));
        }
        return doc.body().html();
    }

    /**
     * {@code href} needs an absolute, safe scheme (links go out to the real
     * destination). {@code src} on {@code <img>} is also allowed as a relative
     * {@code /uploads/...} path — our own upload endpoint, which is what the
     * editor's image button and the {@code img} TipTap extension produce — so a
     * photo inserted into a template/campaign body isn't silently stripped.
     */
    private static boolean isSafeUrl(String url, boolean allowRelativeUpload) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String u = url.trim().toLowerCase();
        if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("mailto:")) {
            return true;
        }
        return allowRelativeUpload && u.startsWith("/uploads/");
    }
}
