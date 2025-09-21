package es.yambo_alco.web.service;

import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.PendingDeletion;
import es.yambo_alco.web.repository.PendingDeletionRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
public class ScheduledDeletionServiceTest {

    @Mock
    private PendingDeletionRepository pendingDeletionRepository;
    @Mock
    private UserRepository userRepository;
    private ScheduledDeletionService scheduledDeletionService;

    @BeforeEach
    public void setup() {
        scheduledDeletionService = new ScheduledDeletionService(pendingDeletionRepository, userRepository);
    }

    @Test
    public void processPendingDeletions_deletesExpiredItems() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        PendingDeletion userDeletion = PendingDeletion.builder()
                .id("1")
                .objectType(DeletionObjectType.USER)
                .objectId("1")
                .scheduledAt(now.minusDays(1))
                .build();

        lenient().when(pendingDeletionRepository.findByScheduledAtBefore(any(LocalDateTime.class))).thenReturn(List.of(userDeletion));

        // When
        scheduledDeletionService.processPendingDeletions();

        // Then
        verify(userRepository).deleteById(1L);
        verify(pendingDeletionRepository).delete(userDeletion);
    }

    @Test
    public void processPendingDeletions_handlesEmptyList() {
        // Given
        lenient().when(pendingDeletionRepository.findByScheduledAtBefore(any(LocalDateTime.class))).thenReturn(List.of());

        // When
        scheduledDeletionService.processPendingDeletions();

        // Then
        verify(userRepository, never()).deleteById(any());
        verify(pendingDeletionRepository, never()).delete(any(PendingDeletion.class));
    }

    @Test
    public void processPendingDeletions_handlesException() {
        // Given
        PendingDeletion userDeletion = PendingDeletion.builder()
                .id("1")
                .objectType(DeletionObjectType.USER)
                .objectId("1")
                .scheduledAt(LocalDateTime.now().minusDays(1))
                .build();

        lenient().when(pendingDeletionRepository.findByScheduledAtBefore(any(LocalDateTime.class))).thenReturn(List.of(userDeletion));
        doThrow(new RuntimeException("Database error")).when(userRepository).deleteById(1L);

        // When
        scheduledDeletionService.processPendingDeletions();

        // Then
        verify(userRepository).deleteById(1L);
        verify(pendingDeletionRepository).save(userDeletion); // Should save with failed status
        verify(pendingDeletionRepository, never()).delete(userDeletion);
    }
}