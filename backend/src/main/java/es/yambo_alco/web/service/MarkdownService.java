package es.yambo_alco.web.service;

import org.commonmark.Extension;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Converts Markdown to sanitised, email-safe HTML and to plain text.
 */
@Service
public class MarkdownService {

    private static final List<Extension> EXTENSIONS = List.of(
            TablesExtension.create()
    );

    private final Parser parser = Parser.builder()
            .extensions(EXTENSIONS)
            .build();

    private final HtmlRenderer renderer = HtmlRenderer.builder()
            .extensions(EXTENSIONS)
            .build();

    /**
     * Safelist that covers every element CommonMark + GFM-tables can produce,
     * plus {@code <img>} with the attributes needed for email rendering.
     */
    private final Safelist safelist = Safelist.relaxed()
            // images
            .addAttributes("img", "src", "alt", "title", "width", "height", "style")
            .addProtocols("img", "src", "http", "https")
            // tables (relaxed already allows table/thead/tbody/tr/td/th but
            // we ensure style is whitelisted for inline CSS)
            .addTags("table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col")
            .addAttributes("table", "style")
            .addAttributes("th", "style", "align")
            .addAttributes("td", "style", "align")
            .addAttributes("tr", "style")
            .addAttributes(":all", "class");

    // ── Inline styles for email clients ──────────────────────────────────

    private static final String IMG_STYLE =
            "max-width: 100%; height: auto; display: block; margin: 8px 0; border-radius: 4px;";

    private static final String TABLE_STYLE =
            "border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px;";

    private static final String TH_STYLE =
            "border: 1px solid #ddd; padding: 8px 12px; background-color: #f2f2f2; text-align: left; font-weight: bold;";

    private static final String TD_STYLE =
            "border: 1px solid #ddd; padding: 8px 12px;";

    /**
     * Render Markdown to sanitised HTML with inline styles suitable for email
     * clients. Safe to inject via Thymeleaf {@code th:utext}.
     */
    public String toSafeHtml(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        Node document = parser.parse(markdown);
        String rawHtml = renderer.render(document);
        String cleanHtml = Jsoup.clean(rawHtml, safelist);
        return addInlineStyles(cleanHtml);
    }

    /**
     * Strip all Markdown / HTML formatting and return plain text.
     */
    public String toPlainText(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        Node document = parser.parse(markdown);
        String rawHtml = renderer.render(document);
        return Jsoup.parse(rawHtml).text();
    }

    // ── internal ─────────────────────────────────────────────────────────

    /**
     * Post-process the sanitised HTML to inject inline CSS that email clients
     * need (they ignore &lt;style&gt; blocks and external sheets).
     */
    private String addInlineStyles(String html) {
        Document doc = Jsoup.parseBodyFragment(html);

        for (Element img : doc.select("img")) {
            img.attr("style", IMG_STYLE);
        }
        for (Element table : doc.select("table")) {
            table.attr("style", TABLE_STYLE);
        }
        for (Element th : doc.select("th")) {
            th.attr("style", TH_STYLE);
        }
        for (Element td : doc.select("td")) {
            td.attr("style", TD_STYLE);
        }

        return doc.body().html();
    }
}
