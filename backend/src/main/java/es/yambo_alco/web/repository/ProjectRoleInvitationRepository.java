package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ProjectRoleInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ProjectRoleInvitationRepository extends JpaRepository<ProjectRoleInvitation, Long> {
    Optional<ProjectRoleInvitation> findByToken(String token);
    List<ProjectRoleInvitation> findByProjectId(String projectId);
    List<ProjectRoleInvitation> findByCreatedAtGreaterThanEqual(LocalDateTime startDate);
    List<ProjectRoleInvitation> findByCreatedBy(String userId);
}
