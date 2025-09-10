package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final AuthService authService;
    private final UserService userService;

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

    @PutMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User currentUser = authService.getCurrentUser(true);
        userService.changePassword(currentUser.getId(), request.getOldPassword(), request.getNewPassword());
        return ResponseEntity.ok().build();
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
        private String username;
        private String email;
        private String name;
        private String[] roles;
        private String[] permissions;

        public UserResponse(User user) {
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.name = user.getName();
            this.roles = user.getRoles().stream().map(role -> role.getId()).toArray(String[]::new);
            this.permissions = user.getRoles().stream()
                    .flatMap(role -> role.getPermissions().stream())
                    .map(permission -> permission.getId())
                    .distinct()
                    .toArray(String[]::new);
        }
    }
}
