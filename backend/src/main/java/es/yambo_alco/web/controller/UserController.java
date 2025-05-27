package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final AuthService authService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getCurrentUser() {
        User user = authService.getCurrentUser(true);
        UserResponse response = new UserResponse(user);
        return ResponseEntity.ok(response);
    }

    @Data
    public class UserResponse {
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
