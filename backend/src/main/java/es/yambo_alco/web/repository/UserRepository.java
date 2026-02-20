package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u JOIN u.profiles p WHERE p.name = 'Monitor' AND u.enabled = true")
    List<User> findMonitors();

    @Query("SELECT DISTINCT u FROM User u JOIN u.profiles p JOIN u.groups g WHERE p.name = 'Monitor' AND u.enabled = true AND g.project.id = :projectId")
    List<User> findMonitorsByProjectId(@org.springframework.data.repository.query.Param("projectId") String projectId);

    @Query("SELECT DISTINCT u FROM User u JOIN u.profiles p JOIN u.groups g WHERE p.name = 'Monitor' AND u.enabled = true AND g.id = :groupId")
    List<User> findMonitorsByGroupId(@org.springframework.data.repository.query.Param("groupId") String groupId);
}
