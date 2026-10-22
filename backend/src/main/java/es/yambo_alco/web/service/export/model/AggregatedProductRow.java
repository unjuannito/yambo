package es.yambo_alco.web.service.export.model;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Represents one aggregated row in a factory or warehouse sheet.
 * Multiple {@link ProductGroupItem}s with identical resolved configuration values
 * are merged into a single row with their quantities summed.
 *
 * <p>{@code configValues} preserves the product option definition order
 * (key = option display label, value = resolved display value).</p>
 */
public class AggregatedProductRow {

    /** Ordered map: option label → resolved display value. */
    private final Map<String, String> configValues;

    /** Sum of quantities across all merged items. */
    private int totalQuantity;

    public AggregatedProductRow(Map<String, String> configValues, int totalQuantity) {
        this.configValues = new LinkedHashMap<>(configValues);
        this.totalQuantity = totalQuantity;
    }

    public Map<String, String> getConfigValues() {
        return configValues;
    }

    public int getTotalQuantity() {
        return totalQuantity;
    }

    public void addQuantity(int quantity) {
        this.totalQuantity += quantity;
    }
}
