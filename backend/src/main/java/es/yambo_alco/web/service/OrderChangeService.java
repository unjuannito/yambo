package es.yambo_alco.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.model.OrderChange;
import es.yambo_alco.web.repository.OrderChangeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Registra y consulta el historial de cambios de pedidos.
 */
@Service
@RequiredArgsConstructor
public class OrderChangeService {

    public static final String ACTION_ADDED = "ADDED";
    public static final String ACTION_MODIFIED = "MODIFIED";
    public static final String ACTION_REMOVED = "REMOVED";
    public static final String ACTION_UNCHANGED = "UNCHANGED";

    private final OrderChangeRepository orderChangeRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public OrderChange record(String orderId, UUID orderProductId, String action,
            String userId, String issueId, String summary, Object before, Object after) {
        OrderChange entry = OrderChange.builder()
                .orderId(orderId)
                .orderProductId(orderProductId)
                .action(action)
                .userId(userId)
                .issueId(issueId)
                .summary(summary)
                .beforeJson(toJson(before))
                .afterJson(toJson(after))
                .build();
        return orderChangeRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<OrderChange> getOrderHistory(String orderId) {
        return orderChangeRepository.findByOrderIdOrderByChangedAtDesc(orderId);
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }
}
