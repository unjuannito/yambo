package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.InvitationRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRegistrationRepository extends JpaRepository<InvitationRegistration, Long> {
    boolean existsByInvitationIdAndUserId(Long invitationId, String userId);
}
