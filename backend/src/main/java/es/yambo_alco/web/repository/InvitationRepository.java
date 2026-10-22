package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Invitation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    @EntityGraph(attributePaths = {"profiles"})
    Optional<Invitation> findByToken(String token);

    @EntityGraph(attributePaths = {"profiles"})
    List<Invitation> findByCreatedAtGreaterThanEqual(LocalDateTime startDate);
}
