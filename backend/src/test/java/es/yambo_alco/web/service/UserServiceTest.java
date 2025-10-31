package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.RoleRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
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
    private RoleRepository roleRepository;
    private PendingDeletionService pendingDeletionService;

    @BeforeEach
    public void setup() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        roleRepository = Mockito.mock(RoleRepository.class);
        pendingDeletionService = Mockito.mock(PendingDeletionService.class);
        userService = new UserService(userRepository, passwordEncoder, roleRepository, pendingDeletionService);
    }

    @Test
    public void listUsers_returnsPageFromRepository() {
        User u = User.builder().id("abc12345").email("a@b.com").name("User").enabled(true).build();
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
                .id("abc12345")
                .email("old@example.com")
                .name("Old Name")
                .build();

        User updatedUser = User.builder()
                .id("abc12345")
                .email("new@example.com")
                .name("New Name")
                .updatedAt(LocalDateTime.now())
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        // When
        User result = userService.updateProfile("abc12345", "New Name", "new@example.com");

        // Then
        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    public void updateProfile_WithExistingEmail_ShouldThrowException() {
        // Given
        User existingUser = User.builder()
                .id("abc12345")
                .email("old@example.com")
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.updateProfile("abc12345", "New Name", "existing@example.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email already in use");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void updateProfile_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("abc12345")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateProfile("abc12345", "New Name", "new@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    public void changePassword_WithValidData_ShouldUpdatePassword() {
        // Given
        User existingUser = User.builder()
                .id("abc12345")
                .password("encodedOldPassword")
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("oldPassword", "encodedOldPassword")).thenReturn(true);
        when(passwordEncoder.encode("newPassword")).thenReturn("encodedNewPassword");

        // When
        userService.changePassword("abc12345", "oldPassword", "newPassword");

        // Then
        verify(passwordEncoder).encode("newPassword");
        verify(userRepository).save(any(User.class));
    }

    @Test
    public void changePassword_WithWrongOldPassword_ShouldThrowException() {
        // Given
        User existingUser = User.builder()
                .id("abc12345")
                .password("encodedOldPassword")
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrongPassword", "encodedOldPassword")).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> userService.changePassword("abc12345", "wrongPassword", "newPassword"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Old password is incorrect");

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void changePassword_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("abc12345")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.changePassword("abc12345", "oldPassword", "newPassword"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    public void updateUserRoles_WithValidData_ShouldUpdateRoles() {
        // Given
        User existingUser = User.builder()
                .id("abc12345")
                .email("test@example.com")
                .build();

        Role role1 = Role.builder().id("ROLE_USER").build();
        Role role2 = Role.builder().id("ROLE_ADMIN").build();

        User updatedUser = User.builder()
                .id("abc12345")
                .email("test@example.com")
                .roles(Set.of(role1, role2))
                .updatedAt(LocalDateTime.now())
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));
        when(roleRepository.findById("ROLE_USER")).thenReturn(Optional.of(role1));
        when(roleRepository.findById("ROLE_ADMIN")).thenReturn(Optional.of(role2));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        // When
        User result = userService.updateUserRoles("abc12345", Set.of("ROLE_USER", "ROLE_ADMIN"));

        // Then
        assertThat(result.getRoles()).hasSize(2);
        assertThat(result.getRoles()).extracting("id").contains("ROLE_USER", "ROLE_ADMIN");
        verify(userRepository).save(any(User.class));
    }

    @Test
    public void updateUserRoles_WithEmptyRoles_ShouldThrowException() {
        // Given
        User existingUser = User.builder().id("abc12345").build();
        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));

        // When & Then
        assertThatThrownBy(() -> userService.updateUserRoles("abc12345", Set.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("At least one role must be specified");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void updateUserRoles_WithNullRoles_ShouldThrowException() {
        // Given
        User existingUser = User.builder().id("abc12345").build();
        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));

        // When & Then
        assertThatThrownBy(() -> userService.updateUserRoles("abc12345", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("At least one role must be specified");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void updateUserRoles_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("abc12345")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateUserRoles("abc12345", Set.of("ROLE_USER")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    public void updateUserRoles_WithNonExistentRole_ShouldThrowException() {
        // Given
        User existingUser = User.builder().id("abc12345").build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));
        when(roleRepository.findById("NON_EXISTENT_ROLE")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateUserRoles("abc12345", Set.of("NON_EXISTENT_ROLE")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Role not found: NON_EXISTENT_ROLE");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void getUserById_WithExistingUser_ShouldReturnUser() {
        // Given
        User existingUser = User.builder()
                .id("abc12345")
                .email("test@example.com")
                .name("Test User")
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));

        // When
        User result = userService.getUserById("abc12345");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("abc12345");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getName()).isEqualTo("Test User");
    }

    @Test
    public void getUserById_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("abc12345")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.getUserById("abc12345"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    public void deleteUser_WithExistingUser_ShouldScheduleDeletion() {
        // Given
        User existingUser = User.builder()
                .id("abc12345")
                .email("test@example.com")
                .name("Test User")
                .build();

        when(userRepository.findById("abc12345")).thenReturn(Optional.of(existingUser));

        // When
        userService.deleteUser("abc12345");

        // Then
        verify(userRepository).findById("abc12345");
        verify(pendingDeletionService).scheduleDeletion(any(), any(), any());
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    public void deleteUser_WithNonExistentUser_ShouldThrowException() {
        // Given
        when(userRepository.findById("abc12345")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.deleteUser("abc12345"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");

        verify(userRepository, never()).delete(any(User.class));
        verify(pendingDeletionService, never()).scheduleDeletion(any(), any(), any());
    }
}
