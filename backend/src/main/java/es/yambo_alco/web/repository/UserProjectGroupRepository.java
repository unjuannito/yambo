package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserProjectGroupRepository
        extends JpaRepository<UserProjectGroup, UserProjectGroup.UserProjectGroupId> {

    List<UserProjectGroup> findByUserIdAndRole(String userId, UserProjectGroupRole role);

    List<UserProjectGroup> findByUserId(String userId);

    List<UserProjectGroup> findByProjectGroupIdAndRole(String projectGroupId, UserProjectGroupRole role);

    List<UserProjectGroup> findByProjectGroup_ProjectIdAndRole(String projectId, UserProjectGroupRole role);

    boolean existsByUserIdAndRole(String userId, UserProjectGroupRole role);

    void deleteByUserIdAndProjectGroupIdAndRole(String userId, String projectGroupId, UserProjectGroupRole role);
}
