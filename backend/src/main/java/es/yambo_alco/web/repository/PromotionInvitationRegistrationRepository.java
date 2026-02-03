package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.PromotionInvitationRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionInvitationRegistrationRepository extends JpaRepository<PromotionInvitationRegistration, Long> {
    boolean existsByPromotionInvitationIdAndUserId(Long promotionInvitationId, String userId);
}
