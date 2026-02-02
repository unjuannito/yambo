package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.enums.OrderStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class OrderSpecifications {

    private OrderSpecifications() {}

    public static Specification<Order> customerIdEquals(Integer customerId) {
        return (root, query, cb) -> customerId == null ? null : cb.equal(root.get("customerId"), customerId);
    }

    public static Specification<Order> statusEquals(OrderStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Order> createdAfter(LocalDateTime startDate) {
        return (root, query, cb) -> startDate == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
    }

    public static Specification<Order> createdBefore(LocalDateTime endDate) {
        return (root, query, cb) -> endDate == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), endDate);
    }

    public static Specification<Order> createdBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate == null) return cb.lessThanOrEqualTo(root.get("createdAt"), endDate);
            if (endDate == null) return cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
            return cb.between(root.get("createdAt"), startDate, endDate);
        };
    }

    public static Specification<Order> paymentIdExists() {
        return (root, query, cb) -> cb.isNotNull(root.get("paymentId"));
    }

    public static Specification<Order> paymentIdEquals(Integer paymentId) {
        return (root, query, cb) -> paymentId == null ? null : cb.equal(root.get("paymentId"), paymentId);
    }
}
