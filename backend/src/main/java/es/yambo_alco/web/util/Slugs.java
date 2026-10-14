package es.yambo_alco.web.util;

import java.text.Normalizer;
import java.util.Locale;

/** Readable URL fragments: "Campamento de Verano" → "campamento-de-verano". */
public final class Slugs {

    public static final int MAX_LENGTH = 80;

    private Slugs() {
    }

    /**
     * Lowercase, no accents, words joined by hyphens. Returns {@code fallback} when the text
     * has nothing usable (blank, only symbols or emoji).
     */
    public static String slugify(String text, String fallback) {
        if (text == null) {
            return fallback;
        }
        String slug = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.length() > MAX_LENGTH) {
            slug = slug.substring(0, MAX_LENGTH).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? fallback : slug;
    }
}
