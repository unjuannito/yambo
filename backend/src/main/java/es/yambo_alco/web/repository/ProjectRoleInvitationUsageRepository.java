package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ProjectRoleInvitationUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRoleInvitationUsageRepository
        extends JpaRepository<ProjectRoleInvitationUsage, Long> {

    List<ProjectRoleInvitationUsage> findByInvitationIdOrderByUsedAtDesc(Long invitationId);

    long countByInvitationId(Long invitationId);
}
