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
    @EntityGraph(attributePaths = {"profiles", "profiles.permissions", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    Optional<User> findByEmail(@Param("email") String email);

    @Override
    @EntityGraph(attributePaths = {"profiles", "profiles.permissions", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    Optional<User> findById(@org.springframework.lang.NonNull String id);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmail(@Param("email") String email);

    /** True only for real accounts: the email of someone added without one can still be invited. */
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email) AND u.hasAccount = true")
    boolean existsAccountByEmail(@Param("email") String email);

    /** A person added without an account whose email is already known: registering with it claims them. */
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email) AND u.hasAccount = false")
    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    Optional<User> findPendingAccountByEmail(@Param("email") String email);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR AND u.enabled = true")
    List<User> findMonitors();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR AND u.enabled = true")
    List<User> findCoordinators();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE (gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR OR gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR) AND u.enabled = true")
    List<User> findStaff();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR AND u.enabled = true AND gr.projectGroup.project.id = :projectId")
    List<User> findMonitorsByProjectId(@Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR AND u.enabled = true AND gr.projectGroup.project.id = :projectId")
    List<User> findCoordinatorsByProjectId(@Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE (gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR OR gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR) AND u.enabled = true AND gr.projectGroup.project.id = :projectId")
    List<User> findStaffByProjectId(@Param("projectId") String projectId);

    /**
     * Staff shown on the public site: either added by hand or holding a
     * MONITOR/COORDINATOR role in an active project. Mirrors {@link User#isPublicStaff()}.
     */
    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.staff s LEFT JOIN u.groupRoles gr LEFT JOIN gr.projectGroup pg LEFT JOIN pg.project p "
            + "WHERE u.enabled = true AND (s.manual = true OR "
            + "((gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR OR gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR) AND p.active = true))")
    List<User> findPublicStaff();

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr JOIN gr.projectGroup pg JOIN pg.project p "
            + "WHERE u.enabled = true AND p.id = :projectId AND p.active = true "
            + "AND (gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR OR gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.COORDINATOR)")
    List<User> findPublicStaffByProjectId(@Param("projectId") String projectId);

    @EntityGraph(attributePaths = {"profiles", "groupRoles", "groupRoles.projectGroup", "groupRoles.projectGroup.project", "staff"})
    @Query("SELECT DISTINCT u FROM User u JOIN u.groupRoles gr WHERE gr.role = es.yambo_alco.web.model.enums.UserProjectGroupRole.MONITOR AND u.enabled = true AND gr.projectGroup.id = :groupId")
    List<User> findMonitorsByGroupId(@Param("groupId") String groupId);
}
