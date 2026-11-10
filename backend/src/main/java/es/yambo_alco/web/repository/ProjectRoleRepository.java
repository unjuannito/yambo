package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRoleRepository extends JpaRepository<ProjectRole, String> {

    Optional<ProjectRole> findByName(String name);

    boolean existsByName(String name);

    List<ProjectRole> findByIsTeamTrueOrderByNameAsc();
}
