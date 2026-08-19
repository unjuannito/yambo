package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.FamilyProductRoleAccess;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.enums.FamilyProductStatus;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

public final class ProductSpecifications {

    private ProductSpecifications() {}

    public static Specification<Product> idContains(String id) {
        return (root, query, cb) -> id == null ? null : cb.like(cb.lower(root.get("id")), "%" + id.toLowerCase() + "%");
    }

    public static Specification<Product> nameContains(String name) {
        return (root, query, cb) -> name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<Product> familyProductNameContains(String familyName) {
        return (root, query, cb) -> {
            if (familyName == null) return null;
            Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
            return cb.like(cb.lower(familyJoin.get("name")), "%" + familyName.toLowerCase() + "%");
        };
    }

    public static Specification<Product> projectNameContains(String projectName) {
        return (root, query, cb) -> {
            if (projectName == null) return null;
            Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
            Join<FamilyProduct, Project> projectJoin = familyJoin.join("projects", JoinType.LEFT);
            return cb.like(cb.lower(projectJoin.get("name")), "%" + projectName.toLowerCase() + "%");
        };
    }

    public static Specification<Product> basePriceGreaterThanOrEqual(BigDecimal minPrice) {
        return (root, query, cb) -> minPrice == null ? null : cb.greaterThanOrEqualTo(root.get("basePrice"), minPrice);
    }

    public static Specification<Product> basePriceLessThanOrEqual(BigDecimal maxPrice) {
        return (root, query, cb) -> maxPrice == null ? null : cb.lessThanOrEqualTo(root.get("basePrice"), maxPrice);
    }

    public static Specification<Product> activeEquals(Boolean active) {
        return (root, query, cb) -> active == null ? null : cb.equal(root.get("active"), active);
    }

    public static Specification<Product> projectIdEquals(String projectId) {
        return (root, query, cb) -> projectId == null ? null : cb.equal(root.get("projectId"), projectId);
    }

    public static Specification<Product> projectIdInFamilyProjects(String projectId) {
        return (root, query, cb) -> {
            if (projectId == null) {
                return null;
            }
            Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
            Join<FamilyProduct, Project> projectJoin = familyJoin.join("projects", JoinType.LEFT);
            return cb.equal(projectJoin.get("id"), projectId);
        };
    }

    /**
     * Permite productos sin drop asociado, o cuyo drop tenga un roleAccess que
     * coincida con alguno de los proyectos+roles del usuario.
     */
    public static Specification<Product> userHasAccess(Set<String> projectIds, Set<UserProjectGroupRole> roles) {
        return (root, query, cb) -> {
            Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
            if (projectIds == null || projectIds.isEmpty() || roles == null || roles.isEmpty()) {
                return cb.isNull(familyJoin);
            }
            query.distinct(true);
            Join<FamilyProduct, FamilyProductRoleAccess> roleAccessJoin = familyJoin.join("roleAccess", JoinType.LEFT);
            return cb.or(
                cb.isNull(familyJoin),
                cb.and(
                    roleAccessJoin.get("projectId").in(projectIds),
                    roleAccessJoin.get("role").in(roles)
                )
            );
        };
    }

    public static Specification<Product> familyProductActive() {
        return (root, query, cb) -> {
            LocalDateTime now = LocalDateTime.now();
            Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
            return cb.or(
                cb.isNull(familyJoin),
                cb.and(
                    cb.equal(familyJoin.get("status"), FamilyProductStatus.OPEN),
                    cb.lessThanOrEqualTo(familyJoin.get("startTms"), now),
                    cb.greaterThan(familyJoin.get("endTms"), now)
                )
            );
        };
    }
}