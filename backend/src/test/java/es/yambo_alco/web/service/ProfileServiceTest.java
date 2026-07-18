package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.repository.PermissionRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import es.yambo_alco.web.exception.BadRequestException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    void listProfiles_WithNoFilters_ShouldReturnAllProfiles() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Profile> profiles = List.of(
                Profile.builder().id("ADMIN").name("Administrator").build(),
                Profile.builder().id("USER").name("User").build()
        );
        Page<Profile> expectedPage = new PageImpl<>(profiles, pageable, profiles.size());
        when(profileRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        // When
        Page<Profile> result = profileService.listProfiles(null, null, null, pageable);

        // Then
        assertEquals(expectedPage, result);
        verify(profileRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void listProfiles_WithQuery_ShouldReturnFilteredProfiles() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Profile> profiles = List.of(
                Profile.builder().id("ADMIN").name("Administrator").build()
        );
        Page<Profile> expectedPage = new PageImpl<>(profiles, pageable, profiles.size());
        when(profileRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        // When
        Page<Profile> result = profileService.listProfiles("admin", null, null, pageable);

        // Then
        assertEquals(1, result.getContent().size());
        assertEquals("ADMIN", result.getContent().get(0).getId());
        verify(profileRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void listProfiles_WithSearchFilter_ShouldReturnFilteredProfiles() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Profile> profiles = List.of(
                Profile.builder().id("ADMIN").name("Administrator").build(),
                Profile.builder().id("USER").name("User").build()
        );
        Page<Profile> allProfiles = new PageImpl<>(profiles, pageable, profiles.size());
        when(profileRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(allProfiles);

        // When
        Page<Profile> result = profileService.listProfiles(null, "admin", null, pageable);

        // Then
        assertEquals(1, result.getContent().size());
        assertEquals("ADMIN", result.getContent().get(0).getId());
        verify(profileRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void listProfiles_WithPermissionFilter_ShouldReturnFilteredProfiles() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Permission permission1 = Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).build();
        Permission permission2 = Permission.builder().id("P002").resource(PermissionResource.USER).action(PermissionAction.UPDATE).build();
        
        List<Profile> profiles = List.of(
                Profile.builder().id("ADMIN").name("Administrator").permissions(Set.of(permission1, permission2)).build(),
                Profile.builder().id("USER").name("User").permissions(Set.of(permission1)).build()
        );
        Page<Profile> allProfiles = new PageImpl<>(profiles, pageable, profiles.size());
        when(profileRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(allProfiles);

        // When
        Page<Profile> result = profileService.listProfiles(null, null, List.of("P002"), pageable);

        // Then
        assertEquals(1, result.getContent().size());
        assertEquals("ADMIN", result.getContent().get(0).getId());
        verify(profileRepository).findAll(any(Specification.class), eq(pageable));
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
                Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).build(),
                Permission.builder().id("P002").resource(PermissionResource.USER).action(PermissionAction.UPDATE).build()
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
        Permission permission1 = Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).build();
        Permission permission2 = Permission.builder().id("P002").resource(PermissionResource.USER).action(PermissionAction.UPDATE).build();

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
        String name = "New Profile Name";
        Set<String> permissionIds = Set.of("P001");

        Permission permission1 = Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).build();

        when(permissionRepository.findById("P001")).thenReturn(Optional.of(permission1));
        when(profileRepository.save(any(Profile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Profile result = profileService.createProfile(name, permissionIds);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(name, result.getName());
        verify(permissionRepository).findById("P001");
        verify(profileRepository).save(any(Profile.class));
    }

    @Test
    void createProfile_WhenPermissionDoesNotExist_ShouldThrowException() {
        // Given
        String name = "New Profile";
        Set<String> permissionIds = Set.of("NONEXISTENT");

        when(permissionRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.createProfile(name, permissionIds));
        assertEquals("Permission not found: NONEXISTENT", exception.getMessage());
        verify(permissionRepository).findById("NONEXISTENT");
        verify(profileRepository, never()).save(any());
    }

    @Test
    void createProfile_WhenNullPermissions_ShouldCreateProfileWithEmptyPermissions() {
        // Given
        String name = "New Profile";
        Set<String> permissionIds = null;

        when(profileRepository.save(any(Profile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Profile result = profileService.createProfile(name, permissionIds);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(name, result.getName());
        verify(permissionRepository, never()).findById(any());
        verify(profileRepository).save(any(Profile.class));
    }

    @Test
    void updateProfile_WhenValidData_ShouldUpdateNameAndPermissions() {
        // Given
        String profileId = "ADMIN";
        String newName = "Updated Admin";
        Set<String> permissionIds = Set.of("P001", "P002");

        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();
        Permission permission1 = Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).build();
        Permission permission2 = Permission.builder().id("P002").resource(PermissionResource.USER).action(PermissionAction.UPDATE).build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));
        when(permissionRepository.findById("P001")).thenReturn(Optional.of(permission1));
        when(permissionRepository.findById("P002")).thenReturn(Optional.of(permission2));
        when(profileRepository.save(any(Profile.class))).thenReturn(existingProfile);

        // When
        Profile result = profileService.updateProfile(profileId, newName, permissionIds);

        // Then
        assertEquals(existingProfile, result);
        verify(profileRepository).findById(profileId);
        verify(permissionRepository).findById("P001");
        verify(permissionRepository).findById("P002");
        verify(profileRepository).save(existingProfile);
    }

    @Test
    void updateProfile_WhenOnlyName_ShouldUpdateNameOnly() {
        // Given
        String profileId = "ADMIN";
        String newName = "Updated Admin";

        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));
        when(profileRepository.save(any(Profile.class))).thenReturn(existingProfile);

        // When
        Profile result = profileService.updateProfile(profileId, newName, null);

        // Then
        assertEquals(existingProfile, result);
        verify(profileRepository).findById(profileId);
        verify(permissionRepository, never()).findById(any());
        verify(profileRepository).save(existingProfile);
    }

    @Test
    void updateProfile_WhenBlankName_ShouldNotUpdateName() {
        // Given
        String profileId = "ADMIN";
        String blankName = "   ";
        Set<String> permissionIds = Set.of("P001");

        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();
        Permission permission1 = Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));
        when(permissionRepository.findById("P001")).thenReturn(Optional.of(permission1));
        when(profileRepository.save(any(Profile.class))).thenReturn(existingProfile);

        // When
        Profile result = profileService.updateProfile(profileId, blankName, permissionIds);

        // Then
        assertEquals(existingProfile, result);
        verify(profileRepository).findById(profileId);
        verify(permissionRepository).findById("P001");
        verify(profileRepository).save(existingProfile);
    }

    @Test
    void updateProfile_WhenPermissionDoesNotExist_ShouldThrowException() {
        // Given
        String profileId = "ADMIN";
        String newName = "Updated Admin";
        Set<String> permissionIds = Set.of("NONEXISTENT");

        Profile existingProfile = Profile.builder().id(profileId).name("Administrator").build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(existingProfile));
        when(permissionRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> profileService.updateProfile(profileId, newName, permissionIds));
        assertEquals("Permission not found: NONEXISTENT", exception.getMessage());
        verify(profileRepository).findById(profileId);
        verify(permissionRepository).findById("NONEXISTENT");
        verify(profileRepository, never()).save(any());
    }

    @Test
    void deleteProfile_WhenProfileExists_ShouldDeleteProfile() {
        // Given
        String profileId = "CUSTOM01";
        Profile existingProfile = Profile.builder().id(profileId).name("Custom").build();

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
        verify(profileRepository, never()).delete(any(Profile.class));
    }

    @Test
    void deleteProfile_WhenSystemProfile_ShouldThrowBadRequest() {
        // Given
        String profileId = "ADMIN";
        Profile systemProfile = Profile.builder().id(profileId).name("Administrator").system(true).build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(systemProfile));

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> profileService.deleteProfile(profileId));
        assertEquals("Cannot delete a system profile", exception.getMessage());
        verify(profileRepository).findById(profileId);
        verify(profileRepository, never()).delete(any(Profile.class));
    }

    @Test
    void updateProfile_WhenSystemProfile_ShouldThrowBadRequest() {
        // Given
        String profileId = "ADMIN";
        Profile systemProfile = Profile.builder().id(profileId).name("Administrator").system(true).build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(systemProfile));

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> profileService.updateProfile(profileId, "New Name", Set.of("P001")));
        assertEquals("Cannot modify a system profile", exception.getMessage());
        verify(profileRepository).findById(profileId);
        verify(profileRepository, never()).save(any());
    }

    @Test
    void updateProfilePermissions_WhenSystemProfile_ShouldThrowBadRequest() {
        // Given
        String profileId = "ADMIN";
        Profile systemProfile = Profile.builder().id(profileId).name("Administrator").system(true).build();

        when(profileRepository.findById(profileId)).thenReturn(Optional.of(systemProfile));

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> profileService.updateProfilePermissions(profileId, Set.of("P001")));
        assertEquals("Cannot modify permissions of a system profile", exception.getMessage());
        verify(profileRepository).findById(profileId);
        verify(profileRepository, never()).save(any());
    }
}