package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.util.Set;

public final class UserSpecifications {

    private UserSpecifications() {}

    public static Specification<User> nameContains(String name) {
        return (root, query, cb) -> name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<User> emailContains(String email) {
        return (root, query, cb) -> email == null ? null : cb.like(cb.lower(root.get("email")), "%" + email.toLowerCase() + "%");
    }

    public static Specification<User> enabledEquals(Boolean enabled) {
        return (root, query, cb) -> enabled == null ? null : cb.equal(root.get("enabled"), enabled);
    }

    public static Specification<User> hasPermissions(Set<String> permissions) {
        return (root, query, cb) -> {
            if (permissions == null || permissions.isEmpty()) return null;
            // join roles -> permissions
            Join<User, Role> roleJoin = root.join("roles", JoinType.LEFT);
            Join<Role, Permission> permJoin = roleJoin.join("permissions", JoinType.LEFT);
            return permJoin.get("id").in(permissions);
        };
    }

    public static Specification<User> hasRoles(Set<String> roles) {
        return (root, query, cb) -> {
            if (roles == null || roles.isEmpty()) return null;
            Join<User, Role> roleJoin = root.join("roles", JoinType.LEFT);
            return roleJoin.get("id").in(roles);
        };
    }
}
