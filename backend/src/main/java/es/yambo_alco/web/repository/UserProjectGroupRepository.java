package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.UserProjectGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserProjectGroupRepository
        extends JpaRepository<UserProjectGroup, UserProjectGroup.UserProjectGroupId> {

    List<UserProjectGroup> findByUserIdAndRole(String userId, String role);

    List<UserProjectGroup> findByUserId(String userId);

    /** Todas las pertenencias que usan un rol (cualquier usuario/grupo), issue #126. */
    List<UserProjectGroup> findByRole(String role);

    List<UserProjectGroup> findByProjectGroupIdAndRole(String projectGroupId, String role);

    List<UserProjectGroup> findByProjectGroup_ProjectIdAndRole(String projectId, String role);

    boolean existsByUserIdAndRole(String userId, String role);

    /** Número de pertenencias que usan un rol, para el guard de borrado (issue #126). */
    long countByRole(String role);

    void deleteByUserIdAndProjectGroupIdAndRole(String userId, String projectGroupId, String role);
}
