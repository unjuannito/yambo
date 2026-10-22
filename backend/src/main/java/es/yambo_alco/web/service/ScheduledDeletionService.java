package es.yambo_alco.web.service;

import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.PendingDeletion;
import es.yambo_alco.web.repository.PendingDeletionRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledDeletionService {

    private final PendingDeletionRepository pendingDeletionRepository;
    private final UserRepository userRepository;

    // @Scheduled(cron = "0 0 2 * * ?") — disabled: table pending_deletion doesn't exist (dead code)
    // @Transactional
    public void processPendingDeletions() {
        log.info("Starting scheduled deletion process");

        LocalDateTime now = LocalDateTime.now();
        List<PendingDeletion> pendingDeletions = pendingDeletionRepository.findByScheduledAtBefore(now);

        log.info("Found {} objects scheduled for deletion", pendingDeletions.size());

        for (PendingDeletion pendingDeletion : pendingDeletions) {
            try {
                deleteObject(pendingDeletion);
                pendingDeletionRepository.delete(pendingDeletion);
                log.info("Successfully deleted {} with id {}", pendingDeletion.getObjectType(), pendingDeletion.getObjectId());
            } catch (Exception e) {
                log.error("Failed to delete {} with id {}: {}", pendingDeletion.getObjectType(), pendingDeletion.getObjectId(), e.getMessage());
                pendingDeletion.setDeletionStatus("FAILED");
                pendingDeletionRepository.save(pendingDeletion);
            }
        }

        log.info("Completed scheduled deletion process");
    }

    private void deleteObject(PendingDeletion pendingDeletion) {
        DeletionObjectType objectType = pendingDeletion.getObjectType();
        String objectId = pendingDeletion.getObjectId();

        switch (objectType) {
            case USER:
                deleteUser(objectId);
                break;
        }
    }

    private void deleteUser(String userId) {
        userRepository.deleteById(userId);
        log.info("Deleted user with id: {}", userId);
    }
}