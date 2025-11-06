package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
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
            // join profiles -> permissions
            Join<User, Profile> profileJoin = root.join("profiles", JoinType.LEFT);
            Join<Profile, Permission> permJoin = profileJoin.join("permissions", JoinType.LEFT);
            return permJoin.get("id").in(permissions);
        };
    }

    public static Specification<User> hasProfiles(Set<String> profiles) {
        return (root, query, cb) -> {
            if (profiles == null || profiles.isEmpty()) return null;
            Join<User, Profile> profileJoin = root.join("profiles", JoinType.LEFT);
            return profileJoin.get("id").in(profiles);
        };
    }
}
