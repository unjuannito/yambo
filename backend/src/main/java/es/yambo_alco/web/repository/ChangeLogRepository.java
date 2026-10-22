package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChangeLogRepository extends JpaRepository<ChangeLog, UUID> {

    List<ChangeLog> findByOrderIdOrderByChangedAtDesc(String orderId);

    List<ChangeLog> findByEntityTypeAndEntityIdOrderByChangedAtDesc(String entityType, String entityId);
}
