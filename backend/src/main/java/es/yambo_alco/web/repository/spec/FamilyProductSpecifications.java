package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import org.springframework.data.jpa.domain.Specification;

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

    /**
     * Filtra los drops accesibles segun los proyectos y roles del usuario.
     * Reemplaza el filtro por perfil auto-creado.
     */
    public static Specification<FamilyProduct> hasRoleAccess(Set<String> projectIds, Set<UserProjectGroupRole> roles) {
        return (root, query, cb) -> {
            if (projectIds == null || projectIds.isEmpty() || roles == null || roles.isEmpty()) {
                return null;
            }
            // Distinct para evitar duplicados por el join con la coleccion
            query.distinct(true);

            var roleAccessJoin = root.join("roleAccess", JoinType.INNER);
            return cb.and(
                roleAccessJoin.get("projectId").in(projectIds),
                roleAccessJoin.get("role").in(roles)
            );
        };
    }
}
