package es.yambo_alco.web.controller;

import es.yambo_alco.web.controller.dto.profile.ProfileResponseDto;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.service.ProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/list")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<Page<ProfileResponseDto>> listProfiles(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String id,
            @RequestParam(required = false) List<String> permissions,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Profile> profilesPage = profileService.listProfiles(query, id, permissions, pageable);
        return ResponseEntity.ok(profilesPage.map(this::mapToProfileResponseDto));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<List<ProfileResponseDto>> getAllProfiles() {
        List<Profile> profiles = profileService.getAllProfiles();
        List<ProfileResponseDto> response = profiles.stream()
                .map(this::mapToProfileResponseDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{profileId}")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<ProfileResponseDto> getProfile(@PathVariable String profileId) {
        Profile profile = profileService.getProfileById(profileId);
        ProfileResponseDto response = mapToProfileResponseDto(profile);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/permissions")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<List<PermissionResponseDto>> getAllPermissions() {
        List<Permission> permissions = profileService.getAllPermissions();
        List<PermissionResponseDto> response = permissions.stream()
                .map(this::mapToPermissionResponseDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{profileId}/permissions")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'update')")
    public ResponseEntity<ProfileResponseDto> updateProfilePermissions(
            @PathVariable String profileId,
            @Valid @RequestBody UpdateProfilePermissionsRequest request) {
        Profile updatedProfile = profileService.updateProfilePermissions(profileId, request.getPermissionIds());
        ProfileResponseDto response = mapToProfileResponseDto(updatedProfile);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{profileId}")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'update')")
    public ResponseEntity<ProfileResponseDto> updateProfile(
            @PathVariable String profileId,
            @Valid @RequestBody UpdateProfileRequest request) {
        Profile updatedProfile = profileService.updateProfile(profileId, request.getName(), request.getPermissionIds());
        ProfileResponseDto response = mapToProfileResponseDto(updatedProfile);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'create')")
    public ResponseEntity<ProfileResponseDto> createProfile(@Valid @RequestBody CreateProfileRequest request) {
        Profile profile = profileService.createProfile(request.getName(), request.getPermissionIds());
        ProfileResponseDto response = mapToProfileResponseDto(profile);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{profileId}")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'delete')")
    public ResponseEntity<String> deleteProfile(@PathVariable String profileId) {
        profileService.deleteProfile(profileId);
        return ResponseEntity.ok("Profile deleted successfully");
    }

    private ProfileResponseDto mapToProfileResponseDto(Profile profile) {
        return ProfileResponseDto.builder()
                .id(profile.getId())
                .name(profile.getName())
                .system(profile.isSystem())
                .permissions(profile.getPermissions().stream()
                        .map(this::mapToPermissionResponseDto)
                        .collect(Collectors.toList()))
                .build();
    }

    private PermissionResponseDto mapToPermissionResponseDto(Permission permission) {
        return PermissionResponseDto.builder()
                .id(permission.getId())
                .resource(permission.getResource().getValue())
                .action(permission.getAction().getValue())
                .hasCondition(permission.isHasCondition())
                .description(permission.getDescription())
                .build();
    }

    @Data
    public static class UpdateProfilePermissionsRequest {
        @NotEmpty(message = "At least one permission must be specified")
        private Set<String> permissionIds;
    }

    @Data
    public static class UpdateProfileRequest {
        @NotBlank(message = "Profile name cannot be blank")
        private String name;

        private Set<String> permissionIds;
    }

    @Data
    public static class CreateProfileRequest {
        @NotBlank(message = "Profile name cannot be blank")
        private String name;

        private Set<String> permissionIds;
    }
}
