package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.NominativeInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NominativeInvitationRepository extends JpaRepository<NominativeInvitation, Long> {
    Optional<NominativeInvitation> findByToken(String token);
}
