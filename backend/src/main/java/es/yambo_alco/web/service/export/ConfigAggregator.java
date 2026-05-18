package es.yambo_alco.web.service.export;

import es.yambo_alco.web.model.OptionValue;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.service.export.model.AggregatedProductRow;
import es.yambo_alco.web.service.export.model.ConfigColumn;
import es.yambo_alco.web.service.export.model.ProductGroupItem;

import java.util.*;

/**
 * Handles two concerns:
 * <ol>
 *   <li>Resolving raw configuration values (IDs, booleans, objects) to human-readable labels.</li>
 *   <li>Aggregating a list of {@link ProductGroupItem}s into {@link AggregatedProductRow}s
 *       by merging items that share identical resolved configuration values and summing quantities.</li>
 * </ol>
 *
 * <p>Aggregation key: all config fields are resolved to their display labels and joined with
 * {@code "|"}. Items producing the same key are merged.</p>
 *
 * <p>Sort order: for {@code select} columns, rows are sorted by the position of each value
 * in the product option's values array (definition order, e.g., S before M before L).
 * For {@code text_input} and {@code checkbox} columns, alphabetical order is used.</p>
 */
public final class ConfigAggregator {

    private ConfigAggregator() {}

    // ════════════════════════════════════════════════════════
    // Column resolution
    // ════════════════════════════════════════════════════════

    /**
     * Derives the list of config columns from the product's declared options,
     * filtering out any option that is excluded for the given report type:
     * <ul>
     *   <li>{@link ExportReportType#FULL} — skips options with {@code excludeFromFull = true}</li>
     *   <li>{@link ExportReportType#FACTORY} / {@link ExportReportType#WAREHOUSE} — skips options
     *       with {@code excludeFromProduction = true}</li>
     * </ul>
     * Falls back to inferring columns from item config keys when no product options are available.
     */
    public static List<ConfigColumn> getConfigColumns(List<ProductOption> productOptions,
                                                      List<ProductGroupItem> items,
                                                      ExportReportType reportType) {
        if (productOptions != null && !productOptions.isEmpty()) {
            return productOptions.stream()
                    .filter(opt -> !isExcluded(opt, reportType))
                    .map(opt -> new ConfigColumn(opt.getName(), opt.getName(), opt.getType()))
                    .toList();
        }
        // Fallback: infer from keys present across all items
        Set<String> keys = new LinkedHashSet<>();
        for (ProductGroupItem item : items) {
            keys.addAll(item.configParsed().keySet());
        }
        return keys.stream()
                .sorted()
                .map(k -> new ConfigColumn(k, k, "text_input"))
                .toList();
    }

    private static boolean isExcluded(ProductOption opt, ExportReportType reportType) {
        if (reportType == null) return false;
        return switch (reportType) {
            case FULL      -> Boolean.TRUE.equals(opt.getExcludeFromFull());
            case FACTORY,
                 WAREHOUSE -> Boolean.TRUE.equals(opt.getExcludeFromProduction());
        };
    }

    /**
     * Resolves a single raw configuration value to its human-readable display string.
     *
     * <ul>
     *   <li>{@code null} / blank → {@code "—"}</li>
     *   <li>Checkbox / Boolean → {@code "Sí"} or {@code "No"}</li>
     *   <li>Select → looked up by ID or label in the option's values list</li>
     *   <li>Object with {@code "label"} key → uses the label</li>
     *   <li>Anything else → {@code String.valueOf(rawValue)}</li>
     * </ul>
     */
    public static String resolveConfigValue(ConfigColumn col, Object rawValue,
                                            List<ProductOption> productOptions) {
        if (rawValue == null || "".equals(rawValue)) {
            return "—";
        }

        if ("checkbox".equals(col.type()) || rawValue instanceof Boolean) {
            return Boolean.TRUE.equals(rawValue) ? "Sí" : "No";
        }

        if ("select".equals(col.type()) && productOptions != null) {
            ProductOption option = productOptions.stream()
                    .filter(o -> col.key().equals(o.getName()))
                    .findFirst()
                    .orElse(null);
            if (option != null && option.getValues() != null) {
                for (OptionValue v : option.getValues()) {
                    if (rawValue.equals(v.getId()) || rawValue.equals(v.getLabel())) {
                        return v.getLabel();
                    }
                }
            }
            if (rawValue instanceof Map<?, ?> map && map.containsKey("label")) {
                return String.valueOf(map.get("label"));
            }
            return String.valueOf(rawValue);
        }

        if (rawValue instanceof Map<?, ?> map && map.containsKey("label")) {
            return String.valueOf(map.get("label"));
        }

        return String.valueOf(rawValue);
    }

    // ════════════════════════════════════════════════════════
    // Aggregation
    // ════════════════════════════════════════════════════════

    /**
     * Aggregates a list of items into distinct configuration rows, summing quantities
     * for items that share an identical resolved-config key.
     *
     * <p>The returned list is sorted: {@code select} columns sort by the values array
     * definition order; other column types sort alphabetically.</p>
     */
    public static List<AggregatedProductRow> aggregate(List<ProductGroupItem> items,
                                                       List<ConfigColumn> configColumns,
                                                       List<ProductOption> productOptions) {
        Map<String, AggregatedProductRow> byKey = new LinkedHashMap<>();

        for (ProductGroupItem item : items) {
            LinkedHashMap<String, String> resolved = new LinkedHashMap<>();
            for (ConfigColumn col : configColumns) {
                resolved.put(col.label(),
                        resolveConfigValue(col, item.configParsed().get(col.key()), productOptions));
            }
            String key = String.join("|", resolved.values());

            AggregatedProductRow existing = byKey.get(key);
            if (existing != null) {
                existing.totalQuantity += item.quantity();
            } else {
                byKey.put(key, new AggregatedProductRow(resolved, item.quantity()));
            }
        }

        List<AggregatedProductRow> result = new ArrayList<>(byKey.values());
        if (!configColumns.isEmpty() && productOptions != null && !productOptions.isEmpty()) {
            result.sort(buildComparator(configColumns, productOptions));
        }
        return result;
    }

    // ════════════════════════════════════════════════════════
    // Sorting
    // ════════════════════════════════════════════════════════

    private static Comparator<AggregatedProductRow> buildComparator(List<ConfigColumn> configColumns,
                                                                     List<ProductOption> productOptions) {
        return (a, b) -> {
            for (ConfigColumn col : configColumns) {
                String valA = a.configValues.getOrDefault(col.label(), "");
                String valB = b.configValues.getOrDefault(col.label(), "");

                // Select columns: sort by values-array position (definition order)
                if ("select".equals(col.type())) {
                    ProductOption opt = productOptions.stream()
                            .filter(o -> col.key().equals(o.getName()))
                            .findFirst().orElse(null);
                    if (opt != null && opt.getValues() != null) {
                        List<String> labels = opt.getValues().stream()
                                .map(OptionValue::getLabel).toList();
                        int idxA = labels.indexOf(valA);
                        int idxB = labels.indexOf(valB);
                        if (idxA < 0) idxA = Integer.MAX_VALUE;
                        if (idxB < 0) idxB = Integer.MAX_VALUE;
                        int cmp = Integer.compare(idxA, idxB);
                        if (cmp != 0) return cmp;
                        continue;
                    }
                }

                // text_input / checkbox / fallback: alphabetical
                int cmp = valA.compareToIgnoreCase(valB);
                if (cmp != 0) return cmp;
            }
            return 0;
        };
    }
}
