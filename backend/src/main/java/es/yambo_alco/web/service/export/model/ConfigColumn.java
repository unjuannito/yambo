package es.yambo_alco.web.service.export.model;

/**
 * Represents a single product option column in an export sheet.
 *
 * @param key   The key used to look up the value in the parsed configuration map.
 * @param label The display name shown as the column header.
 * @param type  The option type: {@code "select"}, {@code "checkbox"}, or {@code "text_input"}.
 */
public record ConfigColumn(String key, String label, String type) {}
