package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.LocalDateTime;
import java.util.Set;

public final class FamilyProductSpecifications {

    private FamilyProductSpecifications() {}

    public static Specification<FamilyProduct> nameContains(String name) {
        return (root, query, cb) -> name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<FamilyProduct> nameEquals(String name) {
        return (root, query, cb) -> name == null ? null : cb.equal(root.get("name"), name);
    }

    public static Specification<FamilyProduct> active() {
        return activeAt(LocalDateTime.now());
    }

    public static Specification<FamilyProduct> activeAt(LocalDateTime dateTime) {
        return (root, query, cb) -> {
            if (dateTime == null) return null;
            return cb.and(
                    cb.lessThanOrEqualTo(root.get("startTms"), dateTime),
                    cb.greaterThanOrEqualTo(root.get("endTms"), dateTime)
            );
        };
    }

    public static Specification<FamilyProduct> expired() {
        return expiredAt(LocalDateTime.now());
    }

    public static Specification<FamilyProduct> expiredAt(LocalDateTime dateTime) {
        return (root, query, cb) -> dateTime == null ? null : cb.lessThan(root.get("endTms"), dateTime);
    }

    public static Specification<FamilyProduct> endsBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate == null) return cb.lessThanOrEqualTo(root.get("endTms"), endDate);
            if (endDate == null) return cb.greaterThanOrEqualTo(root.get("endTms"), startDate);
            return cb.between(root.get("endTms"), startDate, endDate);
        };
    }

    public static Specification<FamilyProduct> hasProfileId(String profileId) {
        return (root, query, cb) -> {
            if (profileId == null) return null;
            Join<FamilyProduct, Profile> profileJoin = root.join("profile", JoinType.LEFT);
            return cb.equal(profileJoin.get("id"), profileId);
        };
    }

    public static Specification<FamilyProduct> hasAnyProfile(Set<String> profileIds) {
        return (root, query, cb) -> {
            if (profileIds == null || profileIds.isEmpty()) return null;
            Join<FamilyProduct, Profile> profileJoin = root.join("profile", JoinType.LEFT);
            return profileJoin.get("id").in(profileIds);
        };
    }

    public static Specification<FamilyProduct> hasProfileName(String profileName) {
        return (root, query, cb) -> {
            if (profileName == null) return null;
            Join<FamilyProduct, Profile> profileJoin = root.join("profile", JoinType.LEFT);
            return cb.like(cb.lower(profileJoin.get("name")), "%" + profileName.toLowerCase() + "%");
        };
    }
}
