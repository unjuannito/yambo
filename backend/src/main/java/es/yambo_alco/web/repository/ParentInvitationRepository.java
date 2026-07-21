package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ParentInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ParentInvitationRepository extends JpaRepository<ParentInvitation, Long> {
    Optional<ParentInvitation> findByToken(String token);
    List<ParentInvitation> findByFamilyProductId(String familyProductId);
    List<ParentInvitation> findByCreatedAtGreaterThanEqual(LocalDateTime startDate);
    List<ParentInvitation> findByCreatedBy(String userId);
}
