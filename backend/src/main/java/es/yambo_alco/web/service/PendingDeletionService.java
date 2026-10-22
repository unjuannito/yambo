package es.yambo_alco.web.service;

import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.PendingDeletion;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.PendingDeletionRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PendingDeletionService {

    private final PendingDeletionRepository pendingDeletionRepository;
    private final UserRepository userRepository;

    @Transactional
    public PendingDeletion scheduleDeletion(DeletionObjectType objectType, String objectId, LocalDateTime scheduledAt) {
        disableObject(objectType, objectId);

        PendingDeletion pendingDeletion = PendingDeletion.builder()
                .objectType(objectType)
                .objectId(objectId)
                .requestedAt(LocalDateTime.now())
                .scheduledAt(scheduledAt)
                .build();

        return pendingDeletionRepository.save(pendingDeletion);
    }

    private void disableObject(DeletionObjectType objectType, String objectId) {
        switch (objectType) {
            case USER:
                disableUser(objectId);
                break;
        }
    }

    private void disableUser(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setEnabled(false);
            userRepository.save(user);
            log.info("Disabled user with id: {}", userId);
        } else {
            throw new IllegalArgumentException("User not found with id: " + userId);
        }
    }
}
