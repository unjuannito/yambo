package es.yambo_alco.web.controller;

import es.yambo_alco.web.controller.dto.user.StaffDto;
import es.yambo_alco.web.controller.dto.user.UpdateStaffRequestDto;
import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.NotificationPreferences;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.PendingDeletionService;
import es.yambo_alco.web.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final AuthService authService;
    private final UserService userService;
    private final PendingDeletionService pendingDeletionService;

    private static final int DEFAULT_DELETION_DAYS = 30;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getCurrentUser() {
        User user = authService.getCurrentUser(true);
        UserResponse response = new UserResponse(user);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User currentUser = authService.getCurrentUser(true);
        User updatedUser = userService.updateProfile(currentUser.getId(), request.getName(), request.getEmail());
        UserResponse response = new UserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/staff")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> updateStaff(@Valid @RequestBody UpdateStaffRequestDto request) {
        User currentUser = authService.getCurrentUser(true);
        User updatedUser = userService.updateStaff(currentUser.getId(), request.toUpdate());
        return ResponseEntity.ok(new UserResponse(updatedUser));
    }

    @PutMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User currentUser = authService.getCurrentUser(true);
        userService.changePassword(currentUser.getId(), request.getOldPassword(), request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/notification-preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationPreferences> getNotificationPreferences() {
        User currentUser = authService.getCurrentUser(true);
        return ResponseEntity.ok(userService.getNotificationPreferences(currentUser.getId()));
    }

    @PutMapping("/notification-preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationPreferences> updateNotificationPreferences(
            @RequestBody NotificationPreferences preferences) {
        User currentUser = authService.getCurrentUser(true);
        return ResponseEntity.ok(userService.updateNotificationPreferences(currentUser.getId(), preferences));
    }

    @PostMapping("/delete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> scheduleAccountDeletion() {
        User currentUser = authService.getCurrentUser(true);
        pendingDeletionService.scheduleDeletion(DeletionObjectType.USER, currentUser.getId().toString(),
                java.time.LocalDateTime.now().plusDays(DEFAULT_DELETION_DAYS));
        return ResponseEntity.ok("User account scheduled for deletion in " + DEFAULT_DELETION_DAYS + " days");
    }

    @Data
    public static class UpdateProfileRequest {
        @NotBlank(message = "Name cannot be blank")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;

        @NotBlank(message = "Email cannot be blank")
        @Email(message = "Email should be valid")
        private String email;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank(message = "Old password cannot be blank")
        private String oldPassword;

        @NotBlank(message = "New password cannot be blank")
        @Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;
    }

    @Data
    public static class UserResponse {
        private String id;
        private String email;
        private String name;
        private StaffDto staff;
        private NotificationPreferences notificationPreferences;
        private GroupRoleResponse[] groupRoles;
        private PermissionResponse[] permissions;

        public UserResponse(User user) {
            this.id = user.getId();
            this.email = user.getEmail();
            this.name = user.getName();
            this.staff = StaffDto.from(user);
            this.notificationPreferences = user.getNotificationPreferences() != null
                    ? user.getNotificationPreferences()
                    : NotificationPreferences.defaults();
            this.groupRoles = user.getGroupRoles().stream()
                    .map(GroupRoleResponse::new)
                    .toArray(GroupRoleResponse[]::new);
            Map<String, Set<String>> resourceActions = user.getProfiles().stream()
                    .flatMap(profile -> profile.getPermissions().stream())
                    .collect(Collectors.groupingBy(
                            p -> p.getResource().getValue(),
                            Collectors.mapping(p -> p.getAction().getValue(), Collectors.toSet())));
            this.permissions = resourceActions.entrySet().stream()
                    .map(entry -> new PermissionResponse(entry.getKey(), entry.getValue().toArray(new String[0])))
                    .toArray(PermissionResponse[]::new);
        }
    }

    @Data
    public static class GroupRoleResponse {
        private String groupId;
        private String groupName;
        private String projectId;
        private String projectName;
        private String role;

        public GroupRoleResponse(UserProjectGroup upg) {
            this.groupId = upg.getProjectGroup().getId();
            this.groupName = upg.getProjectGroup().getName();
            this.projectId = upg.getProjectGroup().getProject().getId();
            this.projectName = upg.getProjectGroup().getProject().getName();
            this.role = upg.getRole().name();
        }
    }

    @Data
    public static class PermissionResponse {
        private String obj;
        private String[] actions;

        public PermissionResponse(String obj, String[] actions) {
            this.obj = obj;
            this.actions = actions;
        }
    }
}
