package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.enums.PermissionResource;
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

@RestController
@RequestMapping("/admin/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<List<Profile>> getAllProfiles() {
        List<Profile> profiles = profileService.getAllProfiles();
        return ResponseEntity.ok(profiles);
    }

    @GetMapping("/{profileId}")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<Profile> getProfile(@PathVariable String profileId) {
        Profile profile = profileService.getProfileById(profileId);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/permissions")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'read')")
    public ResponseEntity<List<Permission>> getAllPermissions() {
        List<Permission> permissions = profileService.getAllPermissions();
        return ResponseEntity.ok(permissions);
    }

    @PutMapping("/{profileId}/permissions")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'update')")
    public ResponseEntity<Profile> updateProfilePermissions(
            @PathVariable String profileId,
            @Valid @RequestBody UpdateProfilePermissionsRequest request) {
        Profile updatedProfile = profileService.updateProfilePermissions(profileId, request.getPermissionIds());
        return ResponseEntity.ok(updatedProfile);
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'create')")
    public ResponseEntity<Profile> createProfile(@Valid @RequestBody CreateProfileRequest request) {
        Profile profile = profileService.createProfile(request.getProfileId(), request.getPermissionIds());
        return ResponseEntity.ok(profile);
    }

    @DeleteMapping("/{profileId}")
    @PreAuthorize("@permissionCheck.hasPermission('profile', 'delete')")
    public ResponseEntity<String> deleteProfile(@PathVariable String profileId) {
        profileService.deleteProfile(profileId);
        return ResponseEntity.ok("Profile deleted successfully");
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
