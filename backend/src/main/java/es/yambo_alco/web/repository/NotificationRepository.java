package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String>, JpaSpecificationExecutor<Notification> {

    Page<Notification> findByRecipientId(String recipientId, Pageable pageable);

    List<Notification> findTop20ByRecipientIdOrderByCreatedAtDesc(String recipientId);

    long countByRecipientIdAndIsReadFalse(String recipientId);

    @org.springframework.data.jpa.repository.Modifying
    void deleteByRecipientId(String recipientId);
}
