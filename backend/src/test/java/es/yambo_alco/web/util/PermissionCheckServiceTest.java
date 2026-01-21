package es.yambo_alco.web.util;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PermissionCheckServiceTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private PermissionCheckService permissionCheckService;

    @Test
    void hasPermission_WhenUserIsNull_ShouldReturnFalse() {
        // Given
        when(authService.getCurrentUser(false)).thenReturn(null);

        // When
        boolean result = permissionCheckService.hasPermission("user", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasNoProfiles_ShouldReturnFalse() {
        // Given
        User user = User.builder()
                .id("U001")
                .profiles(Set.of())
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("user", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasMatchingPermission_ShouldReturnTrue() {
        // Given
        Permission readPermission = Permission.builder()
                .id("P001")
                .resource(PermissionResource.USER)
                .action(PermissionAction.READ)
                .build();

        Profile adminProfile = Profile.builder()
                .id("ADMIN")
                .permissions(Set.of(readPermission))
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(adminProfile))
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("user", "read");

        // Then
        assertTrue(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasDifferentPermission_ShouldReturnFalse() {
        // Given
        Permission writePermission = Permission.builder()
                .id("P002")
                .resource(PermissionResource.USER)
                .action(PermissionAction.UPDATE)
                .build();

        Profile adminProfile = Profile.builder()
                .id("ADMIN")
                .permissions(Set.of(writePermission))
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(adminProfile))
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("user", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasMultipleProfilesWithMatchingPermission_ShouldReturnTrue() {
        // Given
        Permission readPermission = Permission.builder()
                .id("P001")
                .resource(PermissionResource.USER)
                .action(PermissionAction.READ)
                .build();

        Permission writePermission = Permission.builder()
                .id("P002")
                .resource(PermissionResource.USER)
                .action(PermissionAction.UPDATE)
                .build();

        Profile adminProfile = Profile.builder()
                .id("ADMIN")
                .permissions(Set.of(writePermission))
                .build();

        Profile userProfile = Profile.builder()
                .id("USER")
                .permissions(Set.of(readPermission))
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(adminProfile, userProfile))
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("user", "read");

        // Then
        assertTrue(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasNoMatchingPermission_ShouldReturnFalse() {
        // Given
        Permission adminPermission = Permission.builder()
                .id("P001")
                .resource(PermissionResource.PROFILE)
                .action(PermissionAction.UPDATE)
                .build();

        Profile adminProfile = Profile.builder()
                .id("ADMIN")
                .permissions(Set.of(adminPermission))
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(adminProfile))
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("user", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WithEnumOverload_WhenUserHasMatchingPermission_ShouldReturnTrue() {
        // Given
        Permission readPermission = Permission.builder()
                .id("P001")
                .resource(PermissionResource.USER)
                .action(PermissionAction.READ)
                .build();

        Profile userProfile = Profile.builder()
                .id("USER")
                .permissions(Set.of(readPermission))
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(userProfile))
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission(PermissionResource.USER, PermissionAction.READ);

        // Then
        assertTrue(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WithEnumOverload_WhenUserHasNoMatchingPermission_ShouldReturnFalse() {
        // Given
        Permission createPermission = Permission.builder()
                .id("P001")
                .resource(PermissionResource.USER)
                .action(PermissionAction.CREATE)
                .build();

        Profile userProfile = Profile.builder()
                .id("USER")
                .permissions(Set.of(createPermission))
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(userProfile))
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission(PermissionResource.USER, PermissionAction.DELETE);

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WithInvalidResourceString_ShouldReturnFalse() {
        // Given
        User user = User.builder()
                .id("U001")
                .profiles(Set.of())
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("invalid_resource", "read");

        // Then
        assertFalse(result);
    }

    @Test
    void hasPermission_WithInvalidActionString_ShouldReturnFalse() {
        // Given
        User user = User.builder()
                .id("U001")
                .profiles(Set.of())
                .build();

        when(authService.getCurrentUser(false)).thenReturn(user);

        // When
        boolean result = permissionCheckService.hasPermission("user", "invalid_action");

        // Then
        assertFalse(result);
    }
}