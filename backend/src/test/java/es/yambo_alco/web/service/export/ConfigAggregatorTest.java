package es.yambo_alco.web.service.export;

import es.yambo_alco.web.model.OptionValue;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.service.export.model.AggregatedProductRow;
import es.yambo_alco.web.service.export.model.ConfigColumn;
import es.yambo_alco.web.service.export.model.ProductGroupItem;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConfigAggregatorTest {

    // ─── helpers ────────────────────────────────────────────────────

    private static ProductOption selectOption(String name, String... valuePairs) {
        // valuePairs: id1, label1, id2, label2, …
        ProductOption opt = new ProductOption();
        opt.setName(name);
        opt.setType("select");
        List<OptionValue> values = new java.util.ArrayList<>();
        for (int i = 0; i < valuePairs.length; i += 2) {
            OptionValue ov = new OptionValue();
            ov.setId(valuePairs[i]);
            ov.setLabel(valuePairs[i + 1]);
            values.add(ov);
        }
        opt.setValues(values);
        return opt;
    }

    private static ProductOption checkboxOption(String name) {
        ProductOption opt = new ProductOption();
        opt.setName(name);
        opt.setType("checkbox");
        return opt;
    }

    private static ProductOption textOption(String name) {
        ProductOption opt = new ProductOption();
        opt.setName(name);
        opt.setType("text_input");
        return opt;
    }

    private static ProductGroupItem item(Map<String, Object> config) {
        return new ProductGroupItem(
                "ORD001", "Alice", "alice@test.com",
                OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.of(2025, 1, 1, 10, 0),
                1, BigDecimal.TEN, config);
    }

    // ═══════════════════════════════════════════════════════════════
    // getConfigColumns
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getConfigColumns_WithProductOptions_ShouldMapToColumns() {
        ProductOption size = selectOption("Talla", "s", "S", "m", "M");
        ProductOption color = checkboxOption("Estampado");

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                List.of(size, color), List.of(), ExportReportType.FULL);

        assertEquals(2, cols.size());
        assertEquals("Talla", cols.get(0).key());
        assertEquals("Talla", cols.get(0).label());
        assertEquals("select", cols.get(0).type());
        assertEquals("Estampado", cols.get(1).key());
        assertEquals("checkbox", cols.get(1).type());
    }

    @Test
    void getConfigColumns_WithExcludeFromFull_ShouldSkipColumn() {
        ProductOption excluded = selectOption("Color", "r", "Rojo");
        excluded.setExcludeFromFull(true);
        ProductOption kept = textOption("Nota");

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                List.of(excluded, kept), List.of(), ExportReportType.FULL);

        assertEquals(1, cols.size());
        assertEquals("Nota", cols.get(0).key());
    }

    @Test
    void getConfigColumns_WithExcludeFromProduction_FactoryType_ShouldSkipColumn() {
        ProductOption excluded = selectOption("Talla", "s", "S");
        excluded.setExcludeFromProduction(true);
        ProductOption kept = textOption("Notas");

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                List.of(excluded, kept), List.of(), ExportReportType.FACTORY);

        assertEquals(1, cols.size());
        assertEquals("Notas", cols.get(0).key());
    }

    @Test
    void getConfigColumns_WithExcludeFromProduction_WarehouseType_ShouldSkipColumn() {
        ProductOption excluded = textOption("Personalización");
        excluded.setExcludeFromProduction(true);
        ProductOption kept = checkboxOption("Entregado");

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                List.of(excluded, kept), List.of(), ExportReportType.WAREHOUSE);

        assertEquals(1, cols.size());
        assertEquals("Entregado", cols.get(0).key());
    }

    @Test
    void getConfigColumns_WithNullReportType_ShouldNotExcludeAnything() {
        ProductOption opt1 = selectOption("Color", "r", "Rojo");
        opt1.setExcludeFromFull(true);
        ProductOption opt2 = textOption("Nota");

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                List.of(opt1, opt2), List.of(), null);

        assertEquals(2, cols.size()); // neither excluded when reportType is null
    }

    @Test
    void getConfigColumns_WithNullProductOptions_ShouldFallbackToItemKeysSorted() {
        ProductGroupItem it = item(Map.of("Talla", "M", "Color", "Rojo"));

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                null, List.of(it), ExportReportType.FULL);

        // Keys sorted alphabetically: Color, Talla
        assertEquals(2, cols.size());
        assertEquals("Color", cols.get(0).key());
        assertEquals("text_input", cols.get(0).type());
        assertEquals("Talla", cols.get(1).key());
    }

    @Test
    void getConfigColumns_WithEmptyProductOptions_ShouldFallbackToItemKeys() {
        ProductGroupItem it = item(Map.of("Modelo", "A"));

        List<ConfigColumn> cols = ConfigAggregator.getConfigColumns(
                List.of(), List.of(it), ExportReportType.FACTORY);

        assertEquals(1, cols.size());
        assertEquals("Modelo", cols.get(0).key());
    }

    // ═══════════════════════════════════════════════════════════════
    // resolveConfigValue
    // ═══════════════════════════════════════════════════════════════

    @Test
    void resolveConfigValue_WhenNull_ShouldReturnDash() {
        ConfigColumn col = new ConfigColumn("k", "k", "text_input");
        assertEquals("—", ConfigAggregator.resolveConfigValue(col, null, List.of()));
    }

    @Test
    void resolveConfigValue_WhenBlankString_ShouldReturnDash() {
        ConfigColumn col = new ConfigColumn("k", "k", "text_input");
        assertEquals("—", ConfigAggregator.resolveConfigValue(col, "", List.of()));
    }

    @Test
    void resolveConfigValue_WhenCheckboxTypeTrue_ShouldReturnSi() {
        ConfigColumn col = new ConfigColumn("k", "k", "checkbox");
        assertEquals("Sí", ConfigAggregator.resolveConfigValue(col, Boolean.TRUE, List.of()));
    }

    @Test
    void resolveConfigValue_WhenCheckboxTypeFalse_ShouldReturnNo() {
        ConfigColumn col = new ConfigColumn("k", "k", "checkbox");
        assertEquals("No", ConfigAggregator.resolveConfigValue(col, Boolean.FALSE, List.of()));
    }

    @Test
    void resolveConfigValue_WhenBooleanValue_ShouldReturnSiOrNo() {
        // rawValue is a Boolean (not checkbox type)
        ConfigColumn col = new ConfigColumn("k", "k", "text_input");
        assertEquals("Sí", ConfigAggregator.resolveConfigValue(col, Boolean.TRUE, List.of()));
        assertEquals("No", ConfigAggregator.resolveConfigValue(col, Boolean.FALSE, List.of()));
    }

    @Test
    void resolveConfigValue_WhenSelectTypeMatchById_ShouldReturnLabel() {
        ProductOption sizeOpt = selectOption("Talla", "s", "S", "m", "M", "l", "L");
        ConfigColumn col = new ConfigColumn("Talla", "Talla", "select");

        String resolved = ConfigAggregator.resolveConfigValue(col, "m", List.of(sizeOpt));

        assertEquals("M", resolved);
    }

    @Test
    void resolveConfigValue_WhenSelectTypeMatchByLabel_ShouldReturnLabel() {
        ProductOption sizeOpt = selectOption("Talla", "s", "S", "m", "M");
        ConfigColumn col = new ConfigColumn("Talla", "Talla", "select");

        String resolved = ConfigAggregator.resolveConfigValue(col, "S", List.of(sizeOpt));

        assertEquals("S", resolved);
    }

    @Test
    void resolveConfigValue_WhenSelectTypeNoMatch_ShouldReturnRawString() {
        ProductOption sizeOpt = selectOption("Talla", "s", "S");
        ConfigColumn col = new ConfigColumn("Talla", "Talla", "select");

        String resolved = ConfigAggregator.resolveConfigValue(col, "xl", List.of(sizeOpt));

        assertEquals("xl", resolved);
    }

    @Test
    void resolveConfigValue_WhenMapWithLabel_ShouldReturnLabelValue() {
        ConfigColumn col = new ConfigColumn("k", "k", "text_input");
        Map<String, Object> raw = Map.of("label", "Custom Label", "value", "custom");

        String resolved = ConfigAggregator.resolveConfigValue(col, raw, List.of());

        assertEquals("Custom Label", resolved);
    }

    @Test
    void resolveConfigValue_WhenTextInput_ShouldReturnStringValue() {
        ConfigColumn col = new ConfigColumn("k", "k", "text_input");
        assertEquals("hello world", ConfigAggregator.resolveConfigValue(col, "hello world", List.of()));
    }

    // ═══════════════════════════════════════════════════════════════
    // aggregate
    // ═══════════════════════════════════════════════════════════════

    @Test
    void aggregate_WhenEmpty_ShouldReturnEmpty() {
        List<AggregatedProductRow> result = ConfigAggregator.aggregate(
                List.of(), List.of(), List.of());
        assertTrue(result.isEmpty());
    }

    @Test
    void aggregate_WhenSameConfig_ShouldMergeAndSumQuantity() {
        ProductGroupItem item1 = new ProductGroupItem(
                "O1", "Alice", "a@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 3, BigDecimal.TEN, Map.of("Talla", "M"));
        ProductGroupItem item2 = new ProductGroupItem(
                "O2", "Bob", "b@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 2, BigDecimal.TEN, Map.of("Talla", "M"));

        ProductOption tallaOpt = selectOption("Talla", "m", "M");
        ConfigColumn col = new ConfigColumn("Talla", "Talla", "select");

        List<AggregatedProductRow> result = ConfigAggregator.aggregate(
                List.of(item1, item2), List.of(col), List.of(tallaOpt));

        assertEquals(1, result.size());
        assertEquals(5, result.get(0).getTotalQuantity()); // 3 + 2
        assertEquals("M", result.get(0).getConfigValues().get("Talla"));
    }

    @Test
    void aggregate_WhenDifferentConfig_ShouldKeepSeparate() {
        ProductGroupItem item1 = new ProductGroupItem(
                "O1", "Alice", "a@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 1, BigDecimal.TEN, Map.of("Talla", "S"));
        ProductGroupItem item2 = new ProductGroupItem(
                "O2", "Bob", "b@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 2, BigDecimal.TEN, Map.of("Talla", "M"));

        ProductOption tallaOpt = selectOption("Talla", "s", "S", "m", "M");
        ConfigColumn col = new ConfigColumn("Talla", "Talla", "select");

        List<AggregatedProductRow> result = ConfigAggregator.aggregate(
                List.of(item1, item2), List.of(col), List.of(tallaOpt));

        assertEquals(2, result.size());
    }

    @Test
    void aggregate_ShouldSortBySelectDefinitionOrder() {
        // Options defined in order: S, M, L — item with M should come before item with L,
        // and item with S should come first
        ProductOption tallaOpt = selectOption("Talla", "s", "S", "m", "M", "l", "L");
        ConfigColumn col = new ConfigColumn("Talla", "Talla", "select");

        ProductGroupItem itemL = new ProductGroupItem(
                "O3", "Carl", "c@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 1, BigDecimal.TEN, Map.of("Talla", "l"));
        ProductGroupItem itemS = new ProductGroupItem(
                "O1", "Alice", "a@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 1, BigDecimal.TEN, Map.of("Talla", "s"));
        ProductGroupItem itemM = new ProductGroupItem(
                "O2", "Bob", "b@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 1, BigDecimal.TEN, Map.of("Talla", "m"));

        List<AggregatedProductRow> result = ConfigAggregator.aggregate(
                List.of(itemL, itemS, itemM), List.of(col), List.of(tallaOpt));

        assertEquals(3, result.size());
        assertEquals("S", result.get(0).getConfigValues().get("Talla")); // S is first
        assertEquals("M", result.get(1).getConfigValues().get("Talla")); // M second
        assertEquals("L", result.get(2).getConfigValues().get("Talla")); // L third
    }

    @Test
    void aggregate_ShouldSortAlphabeticallyForTextInput() {
        // Provide a text_input option so the sort is triggered (requires non-empty productOptions)
        ProductOption nombreOpt = textOption("Nombre");
        ConfigColumn col = new ConfigColumn("Nombre", "Nombre", "text_input");

        ProductGroupItem itemB = new ProductGroupItem(
                "O1", "A", "a@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 1, BigDecimal.TEN, Map.of("Nombre", "Banana"));
        ProductGroupItem itemA = new ProductGroupItem(
                "O2", "B", "b@test.com", OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.now(), 2, BigDecimal.TEN, Map.of("Nombre", "Apple"));

        List<AggregatedProductRow> result = ConfigAggregator.aggregate(
                List.of(itemB, itemA), List.of(col), List.of(nombreOpt));

        assertEquals(2, result.size());
        assertEquals("Apple", result.get(0).getConfigValues().get("Nombre"));
        assertEquals("Banana", result.get(1).getConfigValues().get("Nombre"));
    }
}
