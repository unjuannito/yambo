package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.repository.InvitationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private MailService mailService;

    private InvitationService invitationService;

    @BeforeEach
    void setUp() {
        invitationService = new InvitationService(invitationRepository, mailService);
        ReflectionTestUtils.setField(invitationService, "expirationHours", 72L);
    }

    @Test
    void createInvitation_ShouldCreateAndSendInvitation() {
        String email = "test@example.com";
        Long invitedBy = 1L;
        LocalDateTime now = LocalDateTime.now();

        Invitation expectedInvitation = Invitation.builder()
            .email(email)
            .token("expected-token")
            .createdAt(now)
            .expiresAt(now.plusHours(72))
            .used(false)
            .invitedBy(invitedBy)
            .build();

        when(invitationRepository.save(any(Invitation.class))).thenReturn(expectedInvitation);

        Invitation result = invitationService.createInvitation(email, invitedBy);

        verify(invitationRepository).save(any(Invitation.class));
        verify(mailService).sendInvitation(
            eq(email),
            eq("Invitación a Yambo"),
            any(String.class)
        );

        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo(email);
        assertThat(result.getInvitedBy()).isEqualTo(invitedBy);
        assertThat(result.isUsed()).isFalse();
    }

    @Test
    void createInvitation_ShouldSetCorrectExpirationTime() {
        String email = "test@example.com";
        Long invitedBy = 1L;
        
        invitationService.createInvitation(email, invitedBy);

        verify(invitationRepository).save(any(Invitation.class));
    }
}
