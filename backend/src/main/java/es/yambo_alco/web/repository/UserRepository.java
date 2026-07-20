package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {

    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    @EntityGraph(attributePaths = {"profiles", "profiles.permissions", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    Optional<User> findByEmail(@Param("email") String email);

    @Override
    @EntityGraph(attributePaths = {"profiles", "profiles.permissions", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    Optional<User> findById(@org.springframework.lang.NonNull String id);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmail(@Param("email") String email);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR AND u.enabled = true")
    List<User> findMonitors();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR AND u.enabled = true")
    List<User> findCoordinators();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE (gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR OR gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR) AND u.enabled = true")
    List<User> findStaff();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR AND u.enabled = true AND gr.projectGroup.project.id = :projectId")
    List<User> findMonitorsByProjectId(@Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR AND u.enabled = true AND gr.projectGroup.project.id = :projectId")
    List<User> findCoordinatorsByProjectId(@Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE (gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR OR gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR) AND u.enabled = true AND gr.projectGroup.project.id = :projectId")
    List<User> findStaffByProjectId(@Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR AND u.enabled = true AND gr.projectGroup.id = :groupId")
    List<User> findMonitorsByGroupId(@Param("groupId") String groupId);
}
