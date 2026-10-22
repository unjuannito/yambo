package es.yambo_alco.web.service.export.model;

import es.yambo_alco.web.model.enums.OrderStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ProductGroupTest {

    private static ProductGroupItem item(int qty, BigDecimal price) {
        return new ProductGroupItem(
                "ORD001", "Alice", "alice@test.com",
                OrderStatus.PAYMENT_CONFIRMED,
                LocalDateTime.of(2025, 1, 1, 10, 0),
                qty, price, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════
    // totalQty
    // ═══════════════════════════════════════════════════════════════

    @Test
    void totalQty_WhenNoItems_ShouldReturnZero() {
        ProductGroup group = new ProductGroup("P1", "Product", "Drop", "D1", null);
        assertEquals(0, group.totalQty());
    }

    @Test
    void totalQty_WithMultipleItems_ShouldSumQuantities() {
        ProductGroup group = new ProductGroup("P1", "Product", "Drop", "D1", null);
        group.items.add(item(3, BigDecimal.TEN));
        group.items.add(item(2, BigDecimal.valueOf(5)));
        group.items.add(item(1, BigDecimal.valueOf(20)));

        assertEquals(6, group.totalQty());
    }

    // ═══════════════════════════════════════════════════════════════
    // totalRevenue
    // ═══════════════════════════════════════════════════════════════

    @Test
    void totalRevenue_WhenNoItems_ShouldReturnZero() {
        ProductGroup group = new ProductGroup("P1", "Product", "Drop", "D1", null);
        assertEquals(0, BigDecimal.ZERO.compareTo(group.totalRevenue()));
    }

    @Test
    void totalRevenue_WithMultipleItems_ShouldSumPriceTimesQuantity() {
        ProductGroup group = new ProductGroup("P1", "Product", "Drop", "D1", null);
        group.items.add(item(2, BigDecimal.valueOf(10)));   // 2 * 10 = 20
        group.items.add(item(3, BigDecimal.valueOf(5)));    // 3 *  5 = 15

        // expected: 20 + 15 = 35
        assertEquals(0, BigDecimal.valueOf(35).compareTo(group.totalRevenue()));
    }

    @Test
    void totalRevenue_WithSingleItem_ShouldReturnPriceTimesQuantity() {
        ProductGroup group = new ProductGroup("P1", "Product", "Drop", "D1", null);
        group.items.add(item(4, new BigDecimal("12.50")));  // 4 * 12.50 = 50.00

        assertEquals(0, new BigDecimal("50.00").compareTo(group.totalRevenue()));
    }
}
