package es.yambo_alco.web.util;

import org.jsoup.Jsoup;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Single-pass interpolation; values never become new expressions or HTML. */
public final class CampaignPlaceholders {
    private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([\\w.]+)\\s*}}|\\$\\{\\s*([\\w.]+)\\s*}");
    private CampaignPlaceholders() {}

    private static final List<String> DISPLAY_ATTRIBUTES = List.of("href", "src", "title", "alt", "style");

    public static String replace(String source, Map<String, Object> values) {
        if (source == null) {
            return "";
        }
        Matcher matcher = TOKEN.matcher(source);
        StringBuffer output = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            Object value = resolvePath(values, key);
            matcher.appendReplacement(output, Matcher.quoteReplacement(value == null ? "" : String.valueOf(value)));
        }
        matcher.appendTail(output);
        return output.toString();
    }

    private static Object resolvePath(Map<String, Object> values, String path) {
        Object value = values;
        for (String part : path.split("\\.")) {
            value = value instanceof Map<?, ?> map ? map.get(part) : null;
        }
        return value;
    }

    /** Replace text and display attributes without altering directives or editor metadata. */
    public static String resolveHtml(String source, Map<String, Object> values) {
        if (source == null) {
            return "";
        }
        var document = Jsoup.parseBodyFragment(source);
        boolean changed = false;
        for (var element : document.getAllElements()) {
            for (var node : element.textNodes()) {
                String original = node.getWholeText();
                String replacement = replace(original, values);
                if (!original.equals(replacement)) {
                    node.text(replacement);
                    changed = true;
                }
            }
            for (String attribute : DISPLAY_ATTRIBUTES) {
                if (!element.hasAttr(attribute)) {
                    continue;
                }
                String original = element.attr(attribute);
                String replacement = replace(original, values);
                if (!original.equals(replacement)) {
                    element.attr(attribute, replacement);
                    changed = true;
                }
            }
        }
        return changed ? document.body().html() : source;
    }
}
