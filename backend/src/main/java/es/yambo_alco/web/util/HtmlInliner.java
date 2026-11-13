package es.yambo_alco.web.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lightweight, dependency-free HTML inliner (issue #123).
 * <p>
 * Email clients ignore {@code <style>} blocks and external sheets, so before a
 * composed / overridden email body is sent we:
 * <ol>
 *   <li>take every {@code <style>} block and inline its declarations onto the
 *       matching elements (selectors: tag, {@code .class}, {@code #id} and
 *       {@code tag.class});</li>
 *   <li>remove the {@code <style>} blocks;</li>
 *   <li>resolve {@code {{token}}} placeholders from a value map (leaving
 *       unknown tokens as-is).</li>
 * </ol>
 * This deliberately avoids adding a CSS-inliner dependency (not available in
 * the offline Maven repo) while covering the simple selectors an association
 * will actually use in a campaign or template body.
 */
public final class HtmlInliner {

    private static final Pattern STYLE_TAG =
            Pattern.compile("<style[^>]*>(.*?)</style>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern DECLARATION =
            Pattern.compile("([^{}]+)\\{([^{}]*)\\}");

    private HtmlInliner() {
    }

    public static String inline(String html, Map<String, Object> tokenValues) {
        if (html == null || html.isBlank()) {
            return html;
        }
        // Capture the raw <style> payloads before jsoup re-parses the document.
        StringBuilder styleBlocks = new StringBuilder();
        Matcher m = STYLE_TAG.matcher(html);
        while (m.find()) {
            styleBlocks.append(m.group(1));
        }
        String bodyHtml = m.replaceAll("");

        Document doc = Jsoup.parseBodyFragment(bodyHtml);

        if (styleBlocks.length() > 0) {
            Map<String, Map<String, String>> rules = parseRules(styleBlocks.toString());
            for (Map.Entry<String, Map<String, String>> rule : rules.entrySet()) {
                Elements targets = select(doc, rule.getKey());
                for (Element el : targets) {
                    el.attr("style", mergeStyle(el.attr("style"), rule.getValue()));
                }
            }
            doc.select("style").remove();
        }

        String result = doc.body().html();
        if (tokenValues != null && !tokenValues.isEmpty()) {
            result = resolveTokens(result, tokenValues);
        }
        return result;
    }

    /** Inline any {@code <style>} blocks only (no token substitution). */
    public static String inlineStyles(String html) {
        return inline(html, Map.of());
    }

    /** Replace every {@code {{token}}} with its value, or an empty string when the token is absent. */
    public static String resolveTokens(String html, Map<String, Object> values) {
        if (html == null || values == null) {
            return html;
        }
        String out = html;
        for (Map.Entry<String, Object> e : values.entrySet()) {
            String val = e.getValue() == null ? "" : String.valueOf(e.getValue());
            out = out.replace("{{" + e.getKey() + "}}", val);
        }
        return out;
    }

    private static Map<String, Map<String, String>> parseRules(String css) {
        Map<String, Map<String, String>> rules = new LinkedHashMap<>();
        Matcher decl = DECLARATION.matcher(css);
        while (decl.find()) {
            String selectors = decl.group(1).trim();
            String body = decl.group(2);
            Map<String, String> props = parseDeclarations(body);
            if (props.isEmpty()) {
                continue;
            }
            for (String selector : selectors.split(",")) {
                String sel = selector.trim();
                if (!sel.isEmpty()) {
                    rules.putIfAbsent(sel, props);
                }
            }
        }
        return rules;
    }

    private static Map<String, String> parseDeclarations(String body) {
        Map<String, String> props = new LinkedHashMap<>();
        for (String part : body.split(";")) {
            int idx = part.indexOf(':');
            if (idx <= 0) {
                continue;
            }
            String prop = part.substring(0, idx).trim().toLowerCase();
            String value = part.substring(idx + 1).trim();
            if (prop.isEmpty() || value.isEmpty()) {
                continue;
            }
            props.put(prop, value);
        }
        return props;
    }

    /**
     * Map a simple selector to the corresponding jsoup query. Supports
     * {@code tag}, {@code .class}, {@code #id} and {@code tag.class}.
     * Unknown / complex selectors are ignored (left un-inlined).
     */
    private static Elements select(Document doc, String selector) {
        if (selector.startsWith(".")) {
            return doc.select("." + selector.substring(1));
        }
        if (selector.startsWith("#")) {
            return doc.select("#" + selector.substring(1));
        }
        int dot = selector.indexOf('.');
        if (dot > 0) {
            return doc.select(selector.substring(0, dot) + "." + selector.substring(dot + 1));
        }
        if (selector.matches("[a-zA-Z][a-zA-Z0-9]*")) {
            return doc.select(selector);
        }
        return new Elements();
    }

    private static String mergeStyle(String existing, Map<String, String> toAdd) {
        Map<String, String> merged = new LinkedHashMap<>();
        if (existing != null && !existing.isBlank()) {
            for (String part : existing.split(";")) {
                int idx = part.indexOf(':');
                if (idx <= 0) {
                    continue;
                }
                String prop = part.substring(0, idx).trim().toLowerCase();
                String value = part.substring(idx + 1).trim();
                if (!prop.isEmpty()) {
                    merged.putIfAbsent(prop, value);
                }
            }
        }
        for (Map.Entry<String, String> e : toAdd.entrySet()) {
            merged.putIfAbsent(e.getKey(), e.getValue());
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : merged.entrySet()) {
            if (sb.length() > 0) {
                sb.append(';');
            }
            sb.append(e.getKey()).append(':').append(e.getValue());
        }
        return sb.toString();
    }
}
