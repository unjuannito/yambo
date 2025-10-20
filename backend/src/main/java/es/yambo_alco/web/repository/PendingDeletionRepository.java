package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.PendingDeletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface PendingDeletionRepository extends JpaRepository<PendingDeletion, String>, JpaSpecificationExecutor<PendingDeletion> {
    List<PendingDeletion> findByScheduledAtBefore(LocalDateTime dateTime);
}