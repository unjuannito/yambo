package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.repository.PermissionRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ProfileServiceTest {

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private ProfileService profileService;

    @Test
    void getAllProfiles_ShouldReturnAllProfiles() {
        // Given
        List<Profile> expectedProfiles = List.of(
                Profile.builder().id("ADMIN").name("Administrator").build(),
                Profile.builder().id("USER").name("User").build()
        );
        when(profileRepository.findAll()).thenReturn(expectedProfiles);

        // When
        List<Profile> result = profileService.getAllProfiles();

        // Then
        assertEquals(expectedProfiles, result);
        verify(profileRepository).findAll();
    }

    @Test
    void getProfileById_WhenProfileExists_ShouldReturnProfile() {
        // Given
        String profileId = "ADMIN";
        Profile expectedProfile = Profile.builder().id(profileId).name("Administrator").build();
        when(profileRepository.findById(profileId)).thenReturn(Optional.of(expectedProfile));

        // When
        Profile result = profileService.getProfileById(profileId);

        // Then
        assertEquals(expectedProfile, result);
        verify(profileRepository).findById(profileId);
    }

    @Test
    void getProfileById_WhenProfileDoesNotExist_ShouldThrowException() {
        // Given
        String profileId = "NONEXISTENT";
        when(profileRepository.findById(profileId)).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.getProfileById(profileId));
        assertEquals("Profile not found: " + profileId, exception.getMessage());
        verify(profileRepository).findById(profileId);
    }

    @Test
    void getAllPermissions_ShouldReturnAllPermissions() {
        // Given
        List<Permission> expectedPermissions = List.of(
                Permission.builder().id("P001").resource("users").action("read").build(),
                Permission.builder().id("P002").resource("users").action("write").build()
        );
        when(permissionRepository.findAll()).thenReturn(expectedPermissions);

        // When
        List<Permission> result = profileService.getAllPermissions();

        // Then
        assertEquals(expectedPermissions, result);
        verify(permissionRepository).findAll();
    }

    @Test
    void updateProfilePermissions_WhenValidPermissions_ShouldUpdateAndReturnProfile() {
        // Given
        String profileId = "ADMIN";
        Set<String> permissionIds = Set.of("P001", "P002");

        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();
        Permission permission1 = Permission.builder().id("P001").resource("users").action("read").build();
        Permission permission2 = Permission.builder().id("P002").resource("users").action("write").build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));
        when(permissionRepository.findById("P001")).thenReturn(Optional.of(permission1));
        when(permissionRepository.findById("P002")).thenReturn(Optional.of(permission2));
        when(profileRepository.save(any(Profile.class))).thenReturn(existingProfile);

        // When
        Profile result = profileService.updateProfilePermissions(profileId, permissionIds);

        // Then
        assertEquals(existingProfile, result);
        verify(profileRepository).findById(profileId);
        verify(permissionRepository).findById("P001");
        verify(permissionRepository).findById("P002");
        verify(profileRepository).save(existingProfile);
    }

    @Test
    void updateProfilePermissions_WhenPermissionDoesNotExist_ShouldThrowException() {
        // Given
        String profileId = "ADMIN";
        Set<String> permissionIds = Set.of("NONEXISTENT");

        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));
        when(permissionRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.updateProfilePermissions(profileId, permissionIds));
        assertEquals("Permission not found: NONEXISTENT", exception.getMessage());
        verify(profileRepository).findById(profileId);
        verify(permissionRepository).findById("NONEXISTENT");
        verify(profileRepository, never()).save(any());
    }

    @Test
    void createProfile_WhenValidData_ShouldCreateAndReturnProfile() {
        // Given
        String profileId = "NEW_PROFILE";
        Set<String> permissionIds = Set.of("P001");

        Permission permission1 = Permission.builder().id("P001").resource("users").action("read").build();
        Profile expectedProfile = Profile.builder()
                .id(profileId)
                .permissions(Set.of(permission1))
                .build();

        when(profileRepository.existsById(profileId)).thenReturn(false);
        when(permissionRepository.findById("P001")).thenReturn(Optional.of(permission1));
        when(profileRepository.save(any(Profile.class))).thenReturn(expectedProfile);

        // When
        Profile result = profileService.createProfile(profileId, permissionIds);

        // Then
        assertEquals(expectedProfile, result);
        verify(profileRepository).existsById(profileId);
        verify(permissionRepository).findById("P001");
        verify(profileRepository).save(any(Profile.class));
    }

    @Test
    void createProfile_WhenProfileAlreadyExists_ShouldThrowException() {
        // Given
        String profileId = "EXISTING_PROFILE";
        Set<String> permissionIds = Set.of("P001");

        when(profileRepository.existsById(profileId)).thenReturn(true);

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.createProfile(profileId, permissionIds));
        assertEquals("Profile already exists: " + profileId, exception.getMessage());
        verify(profileRepository).existsById(profileId);
        verify(permissionRepository, never()).findById(any());
        verify(profileRepository, never()).save(any());
    }

    @Test
    void createProfile_WhenPermissionDoesNotExist_ShouldThrowException() {
        // Given
        String profileId = "NEW_PROFILE";
        Set<String> permissionIds = Set.of("NONEXISTENT");

        when(profileRepository.existsById(profileId)).thenReturn(false);
        when(permissionRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.createProfile(profileId, permissionIds));
        assertEquals("Permission not found: NONEXISTENT", exception.getMessage());
        verify(profileRepository).existsById(profileId);
        verify(permissionRepository).findById("NONEXISTENT");
        verify(profileRepository, never()).save(any());
    }

    @Test
    void createProfile_WhenNullPermissions_ShouldCreateProfileWithEmptyPermissions() {
        // Given
        String profileId = "NEW_PROFILE";
        Set<String> permissionIds = null;

        Profile expectedProfile = Profile.builder()
                .id(profileId)
                .permissions(Set.of())
                .build();

        when(profileRepository.existsById(profileId)).thenReturn(false);
        when(profileRepository.save(any(Profile.class))).thenReturn(expectedProfile);

        // When
        Profile result = profileService.createProfile(profileId, permissionIds);

        // Then
        assertEquals(expectedProfile, result);
        verify(profileRepository).existsById(profileId);
        verify(permissionRepository, never()).findById(any());
        verify(profileRepository).save(any(Profile.class));
    }

    @Test
    void deleteProfile_WhenProfileExists_ShouldDeleteProfile() {
        // Given
        String profileId = "ADMIN";
        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));

        // When
        profileService.deleteProfile(profileId);

        // Then
        verify(profileRepository).findById(profileId);
        verify(profileRepository).delete(existingProfile);
    }

    @Test
    void deleteProfile_WhenProfileDoesNotExist_ShouldThrowException() {
        // Given
        String profileId = "NONEXISTENT";

        when(profileRepository.findById(profileId)).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.deleteProfile(profileId));
        assertEquals("Profile not found: " + profileId, exception.getMessage());
        verify(profileRepository).findById(profileId);
        verify(profileRepository, never()).delete(any());
    }
}