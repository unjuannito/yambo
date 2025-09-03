package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.InvitationRepository;
import es.yambo_alco.web.repository.RoleRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    private InvitationService invitationService;

    @BeforeEach
    void setUp() {
        invitationService = new InvitationService(invitationRepository, roleRepository, userRepository, passwordEncoder, mailService);
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

    @Test
    void completeInvitation_ShouldCreateUserAndMarkInvitationUsed() {
        String token = "valid-token";
        String username = "newuser";
        String password = "password";
        String name = "New User";
        String email = "test@example.com";
        LocalDateTime now = LocalDateTime.now();

        Invitation invitation = Invitation.builder()
            .email(email)
            .token(token)
            .used(false)
            .expiresAt(now.plusHours(1))
            .build();

        Role role = Role.builder().id("ROLE_USER").build();
        User user = User.builder()
            .username(username)
            .password("encoded-password")
            .email(email)
            .name(name)
            .roles(Set.of(role))
            .build();

        when(invitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByUsername(username)).thenReturn(false);
        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(roleRepository.findById("ROLE_USER")).thenReturn(Optional.of(role));
        when(passwordEncoder.encode(password)).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = invitationService.completeInvitation(token, username, password, name);

        verify(invitationRepository).save(invitation);
        assertThat(invitation.isUsed()).isTrue();
        assertThat(result).isEqualTo(user);
    }

    @Test
    void completeInvitation_ShouldThrowIfInvitationNotFound() {
        String token = "invalid-token";

        when(invitationRepository.findByToken(token)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invitationService.completeInvitation(token, "user", "pass", "name"))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Invitation not found");
    }

    @Test
    void completeInvitation_ShouldThrowIfInvitationUsed() {
        String token = "used-token";
        Invitation invitation = Invitation.builder().used(true).build();

        when(invitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> invitationService.completeInvitation(token, "user", "pass", "name"))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Invitation already used");
    }

    @Test
    void completeInvitation_ShouldThrowIfInvitationExpired() {
        String token = "expired-token";
        Invitation invitation = Invitation.builder()
            .used(false)
            .expiresAt(LocalDateTime.now().minusHours(1))
            .build();

        when(invitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> invitationService.completeInvitation(token, "user", "pass", "name"))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Invitation expired");
    }

    @Test
    void completeInvitation_ShouldThrowIfUsernameExists() {
        String token = "valid-token";
        Invitation invitation = Invitation.builder()
            .used(false)
            .expiresAt(LocalDateTime.now().plusHours(1))
            .build();

        when(invitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        assertThatThrownBy(() -> invitationService.completeInvitation(token, "existinguser", "pass", "name"))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Username already exists");
    }

    @Test
    void completeInvitation_ShouldThrowIfEmailExists() {
        String token = "valid-token";
        String email = "existing@example.com";
        Invitation invitation = Invitation.builder()
            .email(email)
            .used(false)
            .expiresAt(LocalDateTime.now().plusHours(1))
            .build();

        when(invitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByUsername("user")).thenReturn(false);
        when(userRepository.existsByEmail(email)).thenReturn(true);

        assertThatThrownBy(() -> invitationService.completeInvitation(token, "user", "pass", "name"))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Email already registered");
    }
}
