package es.yambo_alco.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductOption {
    private String name;
    private String type; // "select", "checkbox", "text_input"
    private List<OptionValue> values;
    private Boolean required;
    private BigDecimal price;
    private List<OptionDependency> dependencies;
    private List<OptionCondition> conditions;
    private String description;
    /** When {@code true}, this option column is omitted from the full detail report (FULL). */
    private Boolean excludeFromFull;
    /**
     * When {@code true}, this option column is omitted from all aggregated production reports
     * (FACTORY and WAREHOUSE). Setting this automatically covers both — they share the same audience.
     */
    private Boolean excludeFromProduction;

    public static final Set<String> SUPPORTED_TYPES = Set.of("select", "checkbox", "text_input");

    public static boolean isSupportedType(String type) {
        return type != null && SUPPORTED_TYPES.contains(type);
    }
}