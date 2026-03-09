package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {

    @EntityGraph(attributePaths = {"profiles", "profiles.permissions", "groups", "groups.project"})
    Optional<User> findByEmail(String email);

    @Override
    @EntityGraph(attributePaths = {"profiles", "profiles.permissions", "groups", "groups.project"})
    Optional<User> findById(@org.springframework.lang.NonNull String id);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {"profiles", "groups", "groups.project"})
    @Query("SELECT u FROM User u JOIN u.profiles p WHERE p.name = 'Monitor' AND u.enabled = true")
    List<User> findMonitors();

    @EntityGraph(attributePaths = {"profiles", "groups", "groups.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.profiles p JOIN u.groups g WHERE p.name = 'Monitor' AND u.enabled = true AND g.project.id = :projectId")
    List<User> findMonitorsByProjectId(@org.springframework.data.repository.query.Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groups", "groups.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.profiles p JOIN u.groups g WHERE p.name = 'Monitor' AND u.enabled = true AND g.id = :groupId")
    List<User> findMonitorsByGroupId(@org.springframework.data.repository.query.Param("groupId") String groupId);
}
