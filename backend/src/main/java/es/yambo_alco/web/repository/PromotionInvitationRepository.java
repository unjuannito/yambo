package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.PromotionInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PromotionInvitationRepository extends JpaRepository<PromotionInvitation, Long> {
    Optional<PromotionInvitation> findByToken(String token);
}
