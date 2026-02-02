package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Project;
import org.springframework.data.jpa.domain.Specification;

public final class ProjectSpecifications {

    private ProjectSpecifications() {}

    public static Specification<Project> nameContains(String name) {
        return (root, query, cb) -> name == null ? null : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<Project> activeEquals(Boolean active) {
        return (root, query, cb) -> active == null ? null : cb.equal(root.get("active"), active);
    }

    public static Specification<Project> seasonEquals(String season) {
        return (root, query, cb) -> season == null ? null : cb.equal(cb.lower(root.get("season")), season.toLowerCase());
    }
}
