package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class UserServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
        private UserService userService;
        private ProfileRepository roleRepository;
    private PendingDeletionService pendingDeletionService;

    @BeforeEach
    public void setup() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        roleRepository = Mockito.mock(ProfileRepository.class);
        pendingDeletionService = Mockito.mock(PendingDeletionService.class);
        userService = new UserService(userRepository, passwordEncoder, roleRepository, pendingDeletionService);
    }

    @Test
    public void listUsers_returnsPageFromRepository() {
        User u = User.builder().id("U0000001").email("a@b.com").name("User").enabled(true).build();
        Page<User> page = new PageImpl<>(List.of(u));
        when(userRepository.findAll(Mockito.<Specification<User>>any(), Mockito.any(PageRequest.class)))
                .thenReturn(page);

        Page<User> res = userService.listUsers(null, null, null, (List<String>) null, (List<String>) null,
                PageRequest.of(0, 10));
        assertThat(res.getTotalElements()).isEqualTo(1);
        assertThat(res.getContent().get(0).getEmail()).isEqualTo("a@b.com");
    }

    @Test
    public void updateProfile_WithValidData_ShouldUpdateUser() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .email("old@example.com")
                .name("Old Name")
                .build();

        User updatedUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .email("new@example.com")
                .name("New Name")
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        // When
        User result = userService.updateProfile("U0000001", "New Name", "new@example.com");

        // Then
        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    public void updateProfile_WithExistingEmail_ShouldThrowException() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .email("old@example.com")
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.updateProfile("U0000001", "New Name", "existing@example.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email already in use");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void updateProfile_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("U0000001")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateProfile("U0000001", "New Name", "new@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    public void changePassword_WithValidData_ShouldUpdatePassword() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .password("encodedOldPassword")
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("oldPassword", "encodedOldPassword")).thenReturn(true);
        when(passwordEncoder.encode("newPassword")).thenReturn("encodedNewPassword");

        // When
        userService.changePassword("U0000001", "oldPassword", "newPassword");

        // Then
        verify(passwordEncoder).encode("newPassword");
        verify(userRepository).save(any(User.class));
    }

    @Test
    public void changePassword_WithWrongOldPassword_ShouldThrowException() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .password("encodedOldPassword")
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrongPassword", "encodedOldPassword")).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> userService.changePassword("U0000001", "wrongPassword", "newPassword"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Old password is incorrect");

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void changePassword_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("U0000001")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.changePassword("U0000001", "oldPassword", "newPassword"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
        public void updateUserProfiles_WithValidData_ShouldUpdateProfiles() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .build();

        Profile role1 = Profile.builder().id("ROLE_USER").build();
        Profile role2 = Profile.builder().id("ROLE_ADMIN").build();

        User updatedUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .profiles(Set.of(role1, role2))
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));
        when(roleRepository.findById("ROLE_USER")).thenReturn(Optional.of(role1));
        when(roleRepository.findById("ROLE_ADMIN")).thenReturn(Optional.of(role2));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        // When
        User result = userService.updateUserProfiles("U0000001", Set.of("ROLE_USER", "ROLE_ADMIN"));

        // Then
        assertThat(result.getProfiles()).hasSize(2);
        assertThat(result.getProfiles()).extracting("id").contains("ROLE_USER", "ROLE_ADMIN");
        verify(userRepository).save(any(User.class));
    }

    @Test
        public void updateUserProfiles_WithEmptyProfiles_ShouldThrowException() {
        // Given
        User existingUser = User.builder().id("U0000001").build();
        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));

        // When & Then
        assertThatThrownBy(() -> userService.updateUserProfiles("U0000001", Set.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("At least one profile must be specified");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
        public void updateUserProfiles_WithNullProfiles_ShouldThrowException() {
        // Given
        User existingUser = User.builder().id("U0000001").build();
        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));

        // When & Then
        assertThatThrownBy(() -> userService.updateUserProfiles("U0000001", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("At least one profile must be specified");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
        public void updateUserProfiles_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("U0000001")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateUserProfiles("U0000001", Set.of("ROLE_USER")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
        public void updateUserProfiles_WithNonExistentProfile_ShouldThrowException() {
        // Given
        User existingUser = User.builder().id("U0000001").build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));
        when(roleRepository.findById("NON_EXISTENT_ROLE")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateUserProfiles("U0000001", Set.of("NON_EXISTENT_ROLE")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Profile not found: NON_EXISTENT_ROLE");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void getUserById_WithExistingUser_ShouldReturnUser() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .email("test@example.com")
                .name("Test User")
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));

        // When
        User result = userService.getUserById("U0000001");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("U0000001");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getName()).isEqualTo("Test User");
    }

    @Test
    public void getUserById_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("U0000001")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.getUserById("U0000001"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    public void deleteUser_WithExistingUser_ShouldScheduleDeletion() {
        // Given
        User existingUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .email("test@example.com")
                .name("Test User")
                .build();

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(existingUser));

        // When
        userService.deleteUser("U0000001");

        // Then
        verify(userRepository).findById("U0000001");
        verify(pendingDeletionService).scheduleDeletion(any(), any(), any());
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    public void deleteUser_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("U0000001")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.deleteUser("U0000001"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");

        verify(userRepository, never()).delete(any(User.class));
        verify(pendingDeletionService, never()).scheduleDeletion(any(), any(), any());
    }
}
