package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.util.Set;

public final class ProductSpecifications {

    private ProductSpecifications() {}

    public static Specification<Product> nameContains(String name) {
        return (root, query, cb) -> name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
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

    public static Specification<Product> userHasAccess(Set<String> profileIds) {
        return (root, query, cb) -> {
            if (profileIds == null || profileIds.isEmpty()) {
                // If no profiles, only allow products without family
                Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
                return cb.isNull(familyJoin);
            }
            // Allow products without family or with family that has matching profiles
            Join<Product, FamilyProduct> familyJoin = root.join("familyProduct", JoinType.LEFT);
            Join<FamilyProduct, Profile> profileJoin = familyJoin.join("profile", JoinType.LEFT);
            return cb.or(
                cb.isNull(familyJoin),
                profileJoin.get("id").in(profileIds)
            );
        };
    }
}