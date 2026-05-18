package es.yambo_alco.web.service.export.model;

import java.util.LinkedHashMap;

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
    public final LinkedHashMap<String, String> configValues;

    /** Sum of quantities across all merged items. */
    public int totalQuantity;

    public AggregatedProductRow(LinkedHashMap<String, String> configValues, int totalQuantity) {
        this.configValues = configValues;
        this.totalQuantity = totalQuantity;
    }
}
