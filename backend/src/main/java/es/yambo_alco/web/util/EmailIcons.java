package es.yambo_alco.web.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads SVG icon files from {@code classpath:icons/email/} and caches them
 * as inline-ready HTML strings for use in Thymeleaf email templates.
 */
public final class EmailIcons {

    private static final Logger log = LoggerFactory.getLogger(EmailIcons.class);
    private static final String BASE_PATH = "icons/email/";
    private static final Map<String, String> CACHE = new ConcurrentHashMap<>();

    private EmailIcons() { }

    /**
     * Returns the SVG markup for the given icon name (without {@code .svg} extension).
     * The result is cached after the first load.
     *
     * @param name icon name, e.g. {@code "circle-check"}
     * @return raw SVG string ready for {@code th:utext}, or empty string on error
     */
    public static String get(String name) {
        return CACHE.computeIfAbsent(name, EmailIcons::load);
    }

    private static String load(String name) {
        String path = BASE_PATH + name + ".svg";
        try {
            ClassPathResource resource = new ClassPathResource(path);
            return resource.getContentAsString(StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            log.error("Could not load email icon '{}': {}", path, e.getMessage());
            return "";
        }
    }
}
