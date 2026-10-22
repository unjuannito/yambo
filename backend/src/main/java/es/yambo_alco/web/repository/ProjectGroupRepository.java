package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ProjectGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectGroupRepository extends JpaRepository<ProjectGroup, String> {
    List<ProjectGroup> findByProjectId(String projectId);
    java.util.Optional<ProjectGroup> findByProjectIdAndNameIsNull(String projectId);
}
