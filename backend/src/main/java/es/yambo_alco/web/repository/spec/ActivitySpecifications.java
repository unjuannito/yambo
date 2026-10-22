package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.enums.ActivityStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class ActivitySpecifications {

    private ActivitySpecifications() {}

    public static Specification<Activity> nameContains(String name) {
        return (root, query, cb) -> name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<Activity> statusEquals(ActivityStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Activity> isPublicEquals(Boolean isPublic) {
        return (root, query, cb) -> isPublic == null ? null : cb.equal(root.get("isPublic"), isPublic);
    }

    public static Specification<Activity> projectIdEquals(String projectId) {
        return (root, query, cb) -> projectId == null ? null : cb.equal(root.get("project").get("id"), projectId);
    }

    public static Specification<Activity> managerIdEquals(String managerId) {
        return (root, query, cb) -> managerId == null ? null : cb.equal(root.get("manager").get("id"), managerId);
    }

    public static Specification<Activity> dateAfter(LocalDateTime startDate) {
        return (root, query, cb) -> startDate == null ? null : cb.greaterThanOrEqualTo(root.get("date"), startDate);
    }

    public static Specification<Activity> dateBefore(LocalDateTime endDate) {
        return (root, query, cb) -> endDate == null ? null : cb.lessThanOrEqualTo(root.get("date"), endDate);
    }

    public static Specification<Activity> dateBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate == null) return cb.lessThanOrEqualTo(root.get("date"), endDate);
            if (endDate == null) return cb.greaterThanOrEqualTo(root.get("date"), startDate);
            return cb.between(root.get("date"), startDate, endDate);
        };
    }
}
