package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.InvitationRegistrationRepository;
import es.yambo_alco.web.repository.InvitationRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class InvitationServiceTest {

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private InvitationRegistrationRepository invitationRegistrationRepository;

    @Mock
        private ProfileRepository profileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private InvitationService invitationService;

    @Test
        void createInvitation_WhenNoProfiles_ShouldThrow() {
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> invitationService.createInvitation("USER1", Set.of(), null, LocalDateTime.now().plusDays(1)));
                assertEquals("Profile IDs are required", exception.getMessage());
    }

    @Test
        void createInvitation_WhenProfileMissing_ShouldThrow() {
                when(profileRepository.findAllById(Set.of("BASIC"))).thenReturn(java.util.List.of());

        BadRequestException exception = assertThrows(BadRequestException.class,
                                () -> invitationService.createInvitation("USER1", Set.of("BASIC"), null, LocalDateTime.now().plusDays(1)));
                assertEquals("One or more profiles not found", exception.getMessage());
    }

    @Test
    void createInvitation_WhenStartAfterEnd_ShouldThrow() {
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> invitationService.createInvitation(
                        "USER1",
                        Set.of("BASIC"),
                        LocalDateTime.now().plusDays(2),
                        LocalDateTime.now().plusDays(1)));
        assertEquals("Start date must be before end date", exception.getMessage());
    }

    @Test
    void createInvitation_WhenNoEnd_ShouldAllow() {
        Profile profile = Profile.builder().id("BASIC").build();
        when(profileRepository.findAllById(Set.of("BASIC"))).thenReturn(java.util.List.of(profile));
        when(invitationRepository.save(any(Invitation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Invitation invitation = invitationService.createInvitation(
                "USER1",
                Set.of("BASIC"),
                null,
                null);

        assertNotNull(invitation.getStartTms());
        assertNull(invitation.getExpiresAt());
        assertEquals("USER1", invitation.getInvitedBy());
                assertEquals(1, invitation.getProfiles().size());
    }

    @Test
    void acceptInvitation_WhenExpired_ShouldThrow() {
        Invitation invitation = Invitation.builder()
                .id(1L)
                .token("tok")
            .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().minusHours(1))
                .profiles(Set.of())
                .build();

        when(invitationRepository.findByToken("tok")).thenReturn(Optional.of(invitation));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> invitationService.acceptInvitation("tok", "a@b.com", "pass", "Name", null));
        assertEquals("Invitation expired", exception.getMessage());
    }

    @Test
    void acceptInvitation_WhenCurrentUser_ShouldAssignProfilesAndRegister() {
        Profile profile = Profile.builder().id("BASIC").build();
        Invitation invitation = Invitation.builder()
                .id(1L)
                .token("tok")
                .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .profiles(Set.of(profile))
                .build();

        User user = User.builder().id("USER1").profiles(new java.util.HashSet<>()).build();

        when(invitationRepository.findByToken("tok")).thenReturn(Optional.of(invitation));
        when(invitationRegistrationRepository.existsByInvitationIdAndUserId(1L, "USER1")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = invitationService.acceptInvitation("tok", null, null, null, user);

        assertEquals("USER1", result.getId());
        assertTrue(result.getProfiles().stream().anyMatch(p -> p.getId().equals("BASIC")));
        verify(invitationRegistrationRepository).save(any());
    }

    @Test
    void acceptInvitation_WhenNewUser_ShouldCreateAndRegister() {
        Profile profile = Profile.builder().id("BASIC").build();
        Invitation invitation = Invitation.builder()
                .id(2L)
                .token("tok2")
                .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .profiles(Set.of(profile))
                .build();

        when(invitationRepository.findByToken("tok2")).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("new@user.com")).thenReturn(false);
        when(passwordEncoder.encode("pass"))
                .thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId("NEW01");
            return u;
        });
        when(invitationRegistrationRepository.existsByInvitationIdAndUserId(2L, "NEW01")).thenReturn(false);

        User result = invitationService.acceptInvitation("tok2", "new@user.com", "pass", "Name", null);

        assertEquals("NEW01", result.getId());
        assertTrue(result.getProfiles().stream().anyMatch(p -> p.getId().equals("BASIC")));
        verify(invitationRegistrationRepository).save(any());
    }

    @Test
    void acceptInvitation_WhenEmailRegistered_ShouldThrow() {
        Invitation invitation = Invitation.builder()
                .id(3L)
                .token("tok3")
                .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .profiles(Set.of())
                .build();

        when(invitationRepository.findByToken("tok3")).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("dup@user.com")).thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> invitationService.acceptInvitation("tok3", "dup@user.com", "pass", "Name", null));
        assertEquals("Email already registered", exception.getMessage());
    }

    @Test
    void acceptInvitation_WhenTokenMissing_ShouldThrow() {
        when(invitationRepository.findByToken("missing")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> invitationService.acceptInvitation("missing", "a@b.com", "pass", "Name", null));
        assertEquals("Invitation not found", exception.getMessage());
    }

    @Test
    void acceptInvitation_WhenNotActiveYet_ShouldThrow() {
        Invitation invitation = Invitation.builder()
                .id(4L)
                .token("tok4")
                .startTms(LocalDateTime.now().plusDays(1))
                .expiresAt(LocalDateTime.now().plusDays(2))
                .profiles(Set.of())
                .build();

        when(invitationRepository.findByToken("tok4")).thenReturn(Optional.of(invitation));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> invitationService.acceptInvitation("tok4", "a@b.com", "pass", "Name", null));
        assertEquals("Invitation not active yet", exception.getMessage());
    }

        @Test
        void acceptInvitation_WhenNoEndAndStarted_ShouldAllow() {
                Invitation invitation = Invitation.builder()
                                .id(5L)
                                .token("tok5")
                                .startTms(LocalDateTime.now().minusDays(1))
                                .expiresAt(null)
                                .profiles(Set.of())
                                .build();

                when(invitationRepository.findByToken("tok5")).thenReturn(Optional.of(invitation));
                when(userRepository.existsByEmail("a@b.com")).thenReturn(false);
                when(passwordEncoder.encode("pass")).thenReturn("hashed");
                when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                        User u = invocation.getArgument(0);
                        u.setId("USER5");
                        return u;
                });
                when(invitationRegistrationRepository.existsByInvitationIdAndUserId(5L, "USER5")).thenReturn(false);

                User result = invitationService.acceptInvitation("tok5", "a@b.com", "pass", "Name", null);

                assertEquals("USER5", result.getId());
                verify(invitationRegistrationRepository).save(any());
        }

        @Test
        void disableInvitation_WhenFound_ShouldSetEnd() {
                Invitation invitation = Invitation.builder()
                                .id(10L)
                                .token("tok10")
                                .startTms(LocalDateTime.now().minusDays(1))
                                .expiresAt(null)
                                .profiles(Set.of())
                                .build();

                when(invitationRepository.findById(10L)).thenReturn(Optional.of(invitation));
                when(invitationRepository.save(any(Invitation.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                Invitation result = invitationService.disableInvitation(10L);

                assertNotNull(result.getExpiresAt());
                verify(invitationRepository).save(any(Invitation.class));
        }
}
