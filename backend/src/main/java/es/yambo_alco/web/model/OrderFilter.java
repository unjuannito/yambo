package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.OrderStatus;
import java.time.LocalDateTime;
import java.util.List;

public record OrderFilter(
    String query,
    String orderId,
    String customerName,
    String customerId,
    List<OrderStatus> statuses,
    LocalDateTime startDate,
    LocalDateTime endDate
) {}
