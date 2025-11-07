package es.yambo_alco.web.util;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
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
        boolean result = permissionCheckService.hasPermission("users", "read");

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
        boolean result = permissionCheckService.hasPermission("users", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasMatchingPermission_ShouldReturnTrue() {
        // Given
        Permission readPermission = Permission.builder()
                .id("P001")
                .resource("users")
                .action("read")
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
        boolean result = permissionCheckService.hasPermission("users", "read");

        // Then
        assertTrue(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasDifferentPermission_ShouldReturnFalse() {
        // Given
        Permission writePermission = Permission.builder()
                .id("P002")
                .resource("users")
                .action("write")
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
        boolean result = permissionCheckService.hasPermission("users", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasMultipleProfilesWithMatchingPermission_ShouldReturnTrue() {
        // Given
        Permission readPermission = Permission.builder()
                .id("P001")
                .resource("users")
                .action("read")
                .build();

        Permission writePermission = Permission.builder()
                .id("P002")
                .resource("users")
                .action("write")
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
        boolean result = permissionCheckService.hasPermission("users", "read");

        // Then
        assertTrue(result);
        verify(authService).getCurrentUser(false);
    }

    @Test
    void hasPermission_WhenUserHasNoMatchingPermission_ShouldReturnFalse() {
        // Given
        Permission adminPermission = Permission.builder()
                .id("P001")
                .resource("admin")
                .action("manage")
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
        boolean result = permissionCheckService.hasPermission("users", "read");

        // Then
        assertFalse(result);
        verify(authService).getCurrentUser(false);
    }
}