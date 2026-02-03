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

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'create')")
    public ResponseEntity<ProfileResponseDto> createProfile(@Valid @RequestBody CreateProfileRequest request) {
        Profile profile = profileService.createProfile(request.getProfileId(), request.getPermissionIds());
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
                .permissions(profile.getPermissions().stream()
                        .map(this::mapToPermissionResponseDto)
                        .collect(Collectors.toList()))
                .isDefault(false) 
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
    public static class CreateProfileRequest {
        @NotBlank(message = "Profile ID cannot be blank")
        private String profileId;

        private Set<String> permissionIds;
    }

    @Data
    public static class UpdateProfileDefaultStatusRequest {
        private Boolean isDefault;
    }
}
