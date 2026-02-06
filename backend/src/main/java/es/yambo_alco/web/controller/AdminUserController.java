package es.yambo_alco.web.controller;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('user', 'read')")
    public ResponseEntity<Page<AdminUserResponse>> listUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) String permissions,
            @RequestParam(required = false) String profiles,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String direction) {
        Set<String> perms = null;
        if (permissions != null && !permissions.isBlank()) {
            perms = Arrays.stream(permissions.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());
        }
        List<String> profilesList = null;
        if (profiles != null && !profiles.isBlank()) {
            profilesList = Arrays.stream(profiles.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }

        Direction dir = "DESC".equalsIgnoreCase(direction) ? Direction.DESC : Direction.ASC;
        PageRequest pr = (sortBy == null || sortBy.isBlank()) ? PageRequest.of(page, size)
                : PageRequest.of(page, size, dir, sortBy);

        Page<User> users = userService.listUsers(name, email, enabled, perms == null ? null : List.copyOf(perms),
                profilesList, pr);
        return ResponseEntity.ok(users.map(AdminUserResponse::new));
    }

    @PutMapping("/profiles")
    @PreAuthorize("@permissionCheck.hasPermission('user', 'update')")
    public ResponseEntity<AdminUserResponse> updateUserProfiles(@RequestParam @NonNull String userId,
            @Valid @RequestBody UpdateProfilesRequest request) {
        User updatedUser = userService.updateUserProfiles(userId, request.getProfileIds());
        AdminUserResponse response = new AdminUserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    @Data
    public static class UpdateProfilesRequest {
        @NotEmpty(message = "At least one profile must be specified")
        private Set<String> profileIds;
    }

    @PutMapping("/profile")
    @PreAuthorize("@permissionCheck.hasPermission('user', 'update')")
    public ResponseEntity<AdminUserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User userToUpdate = userService.getUserById(request.getId());

        User updatedUser = userService.updateProfile(userToUpdate.getId(), request.getName(), request.getEmail());
        AdminUserResponse response = new AdminUserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("@permissionCheck.hasPermission('user', 'delete')")
    public ResponseEntity<String> deleteUser(@PathVariable @NonNull String userId) {
        User currentUser = authService.getCurrentUser(true);
        if (currentUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body("Cannot delete your own account");
        }

        userService.deleteUser(userId);
        return ResponseEntity.ok("User deleted successfully");
    }

    @Data
    public static class UpdateProfileRequest {
        @NonNull
        @NotBlank(message = "User ID cannot be blank")
        private String id;

        @NonNull
        @NotBlank(message = "Name cannot be blank")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;

        @NonNull
        @NotBlank(message = "Email cannot be blank")
        @Email(message = "Email should be valid")
        private String email;
    }

    @Data
    public static class AdminUserResponse {
        private String id;
        private String email;
        private String name;
        private AdminUserProfileResponse[] profiles;
        private AdminUserPermissionResponse[] permissions;
        private String createdAt;
        private boolean enabled;

        public AdminUserResponse(User user) {
            this.id = user.getId();
            this.email = user.getEmail();
            this.name = user.getName();

            this.profiles = user.getProfiles().stream()
                    .map(profile -> new AdminUserProfileResponse(profile.getId(), profile.getName()))
                    .toArray(AdminUserProfileResponse[]::new);

            Map<String, Set<String>> resourceActions = user.getProfiles().stream()
                    .flatMap(profile -> profile.getPermissions().stream())
                    .collect(Collectors.groupingBy(
                            p -> p.getResource().getValue(),
                            Collectors.mapping(p -> p.getAction().getValue(), Collectors.toSet())));
            this.permissions = resourceActions.entrySet().stream()
                    .map(entry -> new AdminUserPermissionResponse(entry.getKey(), entry.getValue().toArray(new String[0])))
                    .toArray(AdminUserPermissionResponse[]::new);
            this.createdAt = user.getCreatedAt() != null ? user.getCreatedAt().toString() : null;

            this.enabled = user.isEnabled();
        }
    }

    @Data
    public static class AdminUserProfileResponse {
        private String id;
        private String name;

        public AdminUserProfileResponse(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    @Data
    public static class AdminUserPermissionResponse {
        private String obj;
        private String[] actions;

        public AdminUserPermissionResponse(String obj, String[] actions) {
            this.obj = obj;
            this.actions = actions;
        }
    }
}