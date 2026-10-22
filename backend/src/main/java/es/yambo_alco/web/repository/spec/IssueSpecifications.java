package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.enums.IssueStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class IssueSpecifications {

    private IssueSpecifications() {}

    public static Specification<Issue> idContains(String id) {
        return (root, query, cb) -> id == null ? null : cb.like(cb.lower(root.get("id")), "%" + id.toLowerCase() + "%");
    }

    public static Specification<Issue> titleContains(String title) {
        return (root, query, cb) -> title == null ? null : cb.like(cb.lower(root.get("title")), "%" + title.toLowerCase() + "%");
    }

    public static Specification<Issue> createdAfter(LocalDateTime startDate) {
        return (root, query, cb) -> startDate == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
    }

    public static Specification<Issue> createdBefore(LocalDateTime endDate) {
        return (root, query, cb) -> endDate == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), endDate);
    }

    public static Specification<Issue> createdBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate == null) return cb.lessThanOrEqualTo(root.get("createdAt"), endDate);
            if (endDate == null) return cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
            return cb.between(root.get("createdAt"), startDate, endDate);
        };
    }

    public static Specification<Issue> statusEquals(IssueStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Issue> statusIn(List<IssueStatus> statuses) {
        return (root, query, cb) -> (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
    }

    public static Specification<Issue> createdByEquals(String userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("createdBy"), userId);
    }

    /**
     * Filtra las incidencias cuyo pedido relacionado pertenece al usuario
     * indicado (customerId del pedido), en lugar de por el informador.
     */
    public static Specification<Issue> orderCustomerEquals(String userId) {
        return (root, query, cb) -> {
            if (userId == null) return null;
            Subquery<UUID> sub = query.subquery(UUID.class);
            Root<Issue> issueRoot = sub.correlate(root);
            Join<Issue, OrderProduct> opJoin = issueRoot.join("orderProducts");
            sub.select(opJoin.get("id"));
            sub.where(cb.equal(opJoin.get("order").get("customerId"), userId));
            return cb.exists(sub);
        };
    }

    /**
     * Incidencias sin ningún producto de pedido vinculado.
     */
    public static Specification<Issue> hasNoOrderProducts() {
        return (root, query, cb) -> {
            Subquery<UUID> sub = query.subquery(UUID.class);
            Root<Issue> issueRoot = sub.correlate(root);
            Join<Issue, OrderProduct> opJoin = issueRoot.join("orderProducts");
            sub.select(opJoin.get("id"));
            return cb.not(cb.exists(sub));
        };
    }

    public static Specification<Issue> queryContains(String query) {
        return (root, queryObj, cb) -> {
            if (query == null || query.isBlank()) return null;
            String pattern = "%" + query.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("id")), pattern),
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("createdBy")), pattern)
            );
        };
    }
}
