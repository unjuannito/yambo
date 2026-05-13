package es.yambo_alco.web.service.export.model;

import es.yambo_alco.web.model.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Represents a single order-product line item, enriched with customer and order data.
 */
public record ProductGroupItem(
        String orderId,
        String clientName,
        String clientEmail,
        OrderStatus orderStatus,
        LocalDateTime orderDate,
        int quantity,
        BigDecimal unitPrice,
        Map<String, Object> configParsed
) {}
