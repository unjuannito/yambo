package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.enums.IssueStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;

public final class IssueSpecifications {

    private IssueSpecifications() {}

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
}
