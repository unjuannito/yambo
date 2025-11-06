package es.yambo_alco.web.service;

import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.PendingDeletion;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.PendingDeletionRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class PendingDeletionServiceTest {

    private PendingDeletionRepository pendingDeletionRepository;
    private UserRepository userRepository;
    private PendingDeletionService pendingDeletionService;

    @BeforeEach
    public void setup() {
        pendingDeletionRepository = Mockito.mock(PendingDeletionRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        pendingDeletionService = new PendingDeletionService(pendingDeletionRepository, userRepository);
    }

    @Test
    public void scheduleDeletion_user_success() {
        // Given
        DeletionObjectType objectType = DeletionObjectType.USER;
        String objectId = "U0000001";
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(7);
        User user = User.builder().id("U0000001").enabled(true).build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(user));
        when(pendingDeletionRepository.save(any(PendingDeletion.class))).thenAnswer(i -> i.getArgument(0));

        // When
        PendingDeletion result = pendingDeletionService.scheduleDeletion(objectType, objectId, scheduledAt);

        // Then
        assertThat(result.getObjectType()).isEqualTo(objectType);
        assertThat(result.getObjectId()).isEqualTo(objectId);
        assertThat(result.getScheduledAt()).isEqualTo(scheduledAt);
        assertThat(result.getRequestedAt()).isBeforeOrEqualTo(LocalDateTime.now());

        // Verify user was disabled
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().isEnabled()).isFalse();

        // Verify pending deletion was saved
        verify(pendingDeletionRepository).save(any(PendingDeletion.class));
    }

    @Test
    public void scheduleDeletion_userNotFound_throwsException() {
        // Given
        DeletionObjectType objectType = DeletionObjectType.USER;
        String objectId = "1";
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(7);

        when(userRepository.findById("U0000001")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> pendingDeletionService.scheduleDeletion(objectType, objectId, scheduledAt))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("User not found with id: " + 1L);
    }
}