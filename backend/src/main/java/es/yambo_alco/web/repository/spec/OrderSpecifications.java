package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderStatus;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Subquery;
import jakarta.persistence.criteria.Root;
import java.time.LocalDateTime;
import java.util.List;

public final class OrderSpecifications {

    private OrderSpecifications() {}

    public static Specification<Order> idContains(String orderId) {
        return (root, query, cb) -> orderId == null ? null : cb.like(cb.lower(root.get("id")), "%" + orderId.toLowerCase() + "%");
    }

    public static Specification<Order> customerIdEquals(String customerId) {
        return (root, query, cb) -> customerId == null ? null : cb.equal(root.get("customerId"), customerId);
    }

    public static Specification<Order> customerNameContains(String customerName) {
        return (root, query, cb) -> {
            if (customerName == null) return null;
            Subquery<String> subquery = query.subquery(String.class);
            Root<User> userRoot = subquery.from(User.class);
            subquery.select(userRoot.get("id"))
                    .where(cb.like(cb.lower(userRoot.get("name")), "%" + customerName.toLowerCase() + "%"));
            return root.get("customerId").in(subquery);
        };
    }

    public static Specification<Order> statusEquals(OrderStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Order> statusIn(List<OrderStatus> statuses) {
        return (root, query, cb) -> (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
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
}
