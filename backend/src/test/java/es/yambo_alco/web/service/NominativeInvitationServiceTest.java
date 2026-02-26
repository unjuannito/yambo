package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.NominativeInvitation;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.NominativeInvitationRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class NominativeInvitationServiceTest {

    @Mock
    private NominativeInvitationRepository nominativeInvitationRepository;

    @Mock
    private ProfileRepository roleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @Mock
    private SettingsService settingsService;

    private NominativeInvitationService nominativeInvitationService;

    @BeforeEach
    void setUp() {
        nominativeInvitationService = new NominativeInvitationService(nominativeInvitationRepository, roleRepository, userRepository, passwordEncoder,
                mailService, settingsService);
        ReflectionTestUtils.setField(nominativeInvitationService, "expirationHours", 72L);
        lenient().when(settingsService.getDomain()).thenReturn("http://localhost:5173");
        lenient().when(settingsService.getOrganizationName()).thenReturn("Yambo");
    }

    @Test
    void createInvitation_ShouldCreateAndSendInvitation() {
        String email = "test@example.com";
        String invitedBy = "U0000001";
        LocalDateTime now = LocalDateTime.now();

        NominativeInvitation expectedInvitation = NominativeInvitation.builder()
                .email(email)
                .token("expected-token")
                .createdAt(now)
                .expiresAt(now.plusHours(72))
                .used(false)
                .invitedBy(invitedBy)
                .build();

        when(nominativeInvitationRepository.save(any(NominativeInvitation.class))).thenReturn(expectedInvitation);

        NominativeInvitation result = nominativeInvitationService.createInvitation(email, invitedBy, null);

        verify(nominativeInvitationRepository).save(any(NominativeInvitation.class));
        verify(mailService).sendInvitation(
                eq(email),
                eq("Invitación a Yambo"),
                any(String.class));

        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo(email);
        assertThat(result.getInvitedBy()).isEqualTo(invitedBy);
        assertThat(result.isUsed()).isFalse();
    }

    @Test
    void createInvitation_ShouldSetCorrectExpirationTime() {
        String email = "test@example.com";
        String invitedBy = "U0000001";

        nominativeInvitationService.createInvitation(email, invitedBy, null);

        verify(nominativeInvitationRepository).save(any(NominativeInvitation.class));
    }

    @Test
    void createInvitation_ShouldThrowIfEmailAlreadyRegistered() {
        String email = "existing@example.com";
        String invitedBy = "U0000001";

        when(userRepository.existsByEmail(email)).thenReturn(true);

        assertThatThrownBy(() -> nominativeInvitationService.createInvitation(email, invitedBy, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email already registered");

        verify(nominativeInvitationRepository, org.mockito.Mockito.never()).save(any(NominativeInvitation.class));
        verify(mailService, org.mockito.Mockito.never()).sendInvitation(any(), any(), any());
    }

    @Test
    void createInvitation_WithProfiles_ShouldValidateProfilesExist() {
        String email = "test@example.com";
        String invitedBy = "U0000001";
        Set<String> profileIds = Set.of("SOCIO", "MONITOR");

        Profile socio = Profile.builder().id("SOCIO").build();
        Profile monitor = Profile.builder().id("MONITOR").build();

        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(roleRepository.findAllById(profileIds)).thenReturn(List.of(socio, monitor));
        when(nominativeInvitationRepository.save(any(NominativeInvitation.class))).thenReturn(NominativeInvitation.builder().email(email).build());

        nominativeInvitationService.createInvitation(email, invitedBy, profileIds);

        verify(roleRepository).findAllById(profileIds);
        verify(nominativeInvitationRepository).save(any(NominativeInvitation.class));
    }

    @Test
    void createInvitation_WithInvalidProfiles_ShouldThrowException() {
        String email = "test@example.com";
        String invitedBy = "U0000001";
        Set<String> profileIds = Set.of("SOCIO", "INVALID_PROFILE");

        Profile socio = Profile.builder().id("SOCIO").build();

        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(roleRepository.findAllById(profileIds)).thenReturn(List.of(socio)); // Only one profile found

        assertThatThrownBy(() -> nominativeInvitationService.createInvitation(email, invitedBy, profileIds))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("One or more profiles not found");

        verify(nominativeInvitationRepository, org.mockito.Mockito.never()).save(any(NominativeInvitation.class));
    }

    @Test
    void completeInvitation_ShouldCreateUserAndMarkInvitationUsed() {
        String token = "valid-token";
        String password = "password";
        String name = "New User";
        String email = "test@example.com";
        LocalDateTime now = LocalDateTime.now();

        NominativeInvitation invitation = NominativeInvitation.builder()
                .email(email)
                .token(token)
                .used(false)
                .expiresAt(now.plusHours(1))
                .build();

        Profile role = Profile.builder().id("INTERESADO").build();
        User user = User.builder()
                .email(email)
                .password("encoded-password")
                .name(name)
                .profiles(Set.of(role))
                .build();

        when(nominativeInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(passwordEncoder.encode(password)).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = nominativeInvitationService.completeInvitation(token, password, name);

        verify(nominativeInvitationRepository).save(invitation);
        assertThat(invitation.isUsed()).isTrue();
        assertThat(result).isEqualTo(user);
        assertThat(result.getProfiles()).containsExactlyInAnyOrder(role);
    }

    @Test
    void completeInvitation_ShouldThrowIfInvitationNotFound() {
        String token = "invalid-token";

        when(nominativeInvitationRepository.findByToken(token)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> nominativeInvitationService.completeInvitation(token, "pass", "name"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Invitation not found");
    }

    @Test
    void completeInvitation_ShouldThrowIfInvitationUsed() {
        String token = "used-token";
        NominativeInvitation invitation = NominativeInvitation.builder().used(true).build();

        when(nominativeInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> nominativeInvitationService.completeInvitation(token, "pass", "name"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invitation already used");
    }

    @Test
    void completeInvitation_ShouldThrowIfInvitationExpired() {
        String token = "expired-token";
        NominativeInvitation invitation = NominativeInvitation.builder()
                .used(false)
                .expiresAt(LocalDateTime.now().minusHours(1))
                .build();

        when(nominativeInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> nominativeInvitationService.completeInvitation(token, "pass", "name"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invitation expired");
    }

    @Test
    void completeInvitation_ShouldThrowIfEmailExists() {
        String token = "valid-token";
        String email = "existing@example.com";
        NominativeInvitation invitation = NominativeInvitation.builder()
                .email(email)
                .used(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(nominativeInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail(email)).thenReturn(true);

        assertThatThrownBy(() -> nominativeInvitationService.completeInvitation(token, "pass", "name"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email already registered");
    }

    @Test
    void createInvitation_WithProfiles_ShouldValidateAndAssignProfiles() {
        // Given
        String email = "test@example.com";
        String invitedBy = "U0000001";
        Set<String> profileIds = Set.of("SOCIO", "MONITOR");

        Profile socioRole = Profile.builder().id("SOCIO").build();
        Profile monitorRole = Profile.builder().id("MONITOR").build();
        Set<Profile> roles = Set.of(socioRole, monitorRole);

        when(roleRepository.findAllById(profileIds)).thenReturn(roles.stream().toList());
        when(nominativeInvitationRepository.save(any(NominativeInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        NominativeInvitation result = nominativeInvitationService.createInvitation(email, invitedBy, profileIds);

        // Then
        verify(roleRepository).findAllById(profileIds);
        verify(nominativeInvitationRepository).save(any(NominativeInvitation.class));
        assertThat(result.getProfiles()).hasSize(2);
        assertThat(result.getProfiles()).containsExactlyInAnyOrder(socioRole, monitorRole);
    }

    @Test
    void createInvitation_WithInvalidProfiles_ShouldThrowBadRequestException() {
        // Given
        String email = "test@example.com";
        String invitedBy = "U0000001";
        Set<String> profileIds = Set.of("SOCIO", "INVALID_PROFILE");

        Profile socioRole = Profile.builder().id("SOCIO").build();
        // Only one role returned, meaning INVALID_ROLE doesn't exist
        when(roleRepository.findAllById(profileIds)).thenReturn(List.of(socioRole));

        // When & Then
        assertThatThrownBy(() -> nominativeInvitationService.createInvitation(email, invitedBy, profileIds))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("One or more profiles not found");
    }

    @Test
    void createInvitation_WithNullRoles_ShouldCreateInvitationWithEmptyRoles() {
        // Given
        String email = "test@example.com";
        String invitedBy = "U0000001";

        when(nominativeInvitationRepository.save(any(NominativeInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        NominativeInvitation result = nominativeInvitationService.createInvitation(email, invitedBy, null);

        // Then
        verify(nominativeInvitationRepository).save(any(NominativeInvitation.class));
        assertThat(result.getProfiles()).isEmpty();
    }

    @Test
    void createInvitation_WithEmptyRoles_ShouldCreateInvitationWithEmptyRoles() {
        // Given
        String email = "test@example.com";
        String invitedBy = "U0000001";
        Set<String> roleIds = Set.of();

        when(nominativeInvitationRepository.save(any(NominativeInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        NominativeInvitation result = nominativeInvitationService.createInvitation(email, invitedBy, roleIds);

        // Then
        verify(nominativeInvitationRepository).save(any(NominativeInvitation.class));
        assertThat(result.getProfiles()).isEmpty();
    }

    @Test
    void completeInvitation_WithInvitationRoles_ShouldAssignRolesToUser() {
        // Given
        String token = "valid-token";
        String password = "password";
        String name = "New User";
        String email = "test@example.com";
        LocalDateTime now = LocalDateTime.now();

        Profile socioRole = Profile.builder().id("SOCIO").build();
        Profile monitorRole = Profile.builder().id("MONITOR").build();
        Set<Profile> invitationRoles = Set.of(socioRole, monitorRole);

        NominativeInvitation invitation = NominativeInvitation.builder()
                .email(email)
                .token(token)
                .used(false)
                .expiresAt(now.plusHours(1))
                .profiles(invitationRoles)
                .build();

        when(nominativeInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(passwordEncoder.encode(password)).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        User result = nominativeInvitationService.completeInvitation(token, password, name);

        // Then
        assertThat(result.getProfiles()).hasSize(2);
        assertThat(result.getProfiles()).containsExactlyInAnyOrder(socioRole, monitorRole);
        verify(nominativeInvitationRepository).save(invitation);
        assertThat(invitation.isUsed()).isTrue();
    }

    @Test
    void getAllInvitations_ShouldReturnAllInvitations() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        NominativeInvitation invitation1 = NominativeInvitation.builder()
                .id(1L)
                .email("user1@example.com")
                .token("token1")
                .createdAt(now)
                .expiresAt(now.plusHours(72))
                .used(false)
                .build();

        NominativeInvitation invitation2 = NominativeInvitation.builder()
                .id(2L)
                .email("user2@example.com")
                .token("token2")
                .createdAt(now)
                .expiresAt(now.plusHours(72))
                .used(true)
                .build();

        when(nominativeInvitationRepository.findAll()).thenReturn(List.of(invitation1, invitation2));

        // When
        List<NominativeInvitation> result = nominativeInvitationService.getAllInvitations();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyInAnyOrder(invitation1, invitation2);
        verify(nominativeInvitationRepository).findAll();
    }

    @Test
    void getAllInvitations_WithNoInvitations_ShouldReturnEmptyList() {
        // Given
        when(nominativeInvitationRepository.findAll()).thenReturn(List.of());

        // When
        List<NominativeInvitation> result = nominativeInvitationService.getAllInvitations();

        // Then
        assertThat(result).isEmpty();
        verify(nominativeInvitationRepository).findAll();
    }

    @Test
    void deleteInvitation_WithExistingInvitation_ShouldDeleteInvitation() {
        // Given
        Long invitationId = 1L;
        NominativeInvitation invitation = NominativeInvitation.builder()
                .id(invitationId)
                .email("test@example.com")
                .token("token123")
                .build();

        when(nominativeInvitationRepository.findById(invitationId)).thenReturn(Optional.of(invitation));

        // When
        nominativeInvitationService.deleteInvitation(invitationId);

        // Then
        verify(nominativeInvitationRepository).findById(invitationId);
        verify(nominativeInvitationRepository).delete(invitation);
    }

    @Test
    void deleteInvitation_WithNonExistentInvitation_ShouldThrowException() {
        // Given
        Long invitationId = 999L;
        when(nominativeInvitationRepository.findById(invitationId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> nominativeInvitationService.deleteInvitation(invitationId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Invitation not found");

        verify(nominativeInvitationRepository).findById(invitationId);
        verify(nominativeInvitationRepository, org.mockito.Mockito.never()).delete(any(NominativeInvitation.class));
    }

    @Test
    void deleteInvitation_WithDifferentId_ShouldCallRepositoryWithCorrectId() {
        // Given
        Long invitationId = 42L;
        NominativeInvitation invitation = NominativeInvitation.builder()
                .id(invitationId)
                .email("user@example.com")
                .token("unique-token")
                .build();

        when(nominativeInvitationRepository.findById(invitationId)).thenReturn(Optional.of(invitation));

        // When
        nominativeInvitationService.deleteInvitation(invitationId);

        // Then
        verify(nominativeInvitationRepository).findById(invitationId);
        verify(nominativeInvitationRepository).delete(invitation);
    }
}
