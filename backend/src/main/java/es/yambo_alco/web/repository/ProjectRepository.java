package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String>, JpaSpecificationExecutor<Project> {
    boolean existsByName(String name);
    List<Project> findByActiveTrueAndFeaturedTrue();
    List<Project> findByActiveTrue();
}
