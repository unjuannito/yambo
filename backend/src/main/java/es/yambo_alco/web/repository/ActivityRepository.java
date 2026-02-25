package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, String>, JpaSpecificationExecutor<Activity> {
    List<Activity> findByIsPublicTrueOrderByDateAsc();
    List<Activity> findByProjectIdOrderByDateAsc(String projectId);
}
