package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, String>, JpaSpecificationExecutor<Activity> {
    List<Activity> findByIsPublicTrueOrderByDateDesc();
    List<Activity> findByProjectIdOrderByDateAsc(String projectId);
    java.util.Optional<Activity> findByIdAndIsPublicTrue(String id);
    java.util.Optional<Activity> findBySlugAndIsPublicTrue(String slug);
    boolean existsBySlug(String slug);
    List<Activity> findBySlugIsNull(org.springframework.data.domain.Sort sort);
}
