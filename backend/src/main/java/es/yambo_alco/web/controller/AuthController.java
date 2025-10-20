package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.InvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final InvitationService invitationService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        String token = authService.authenticate(request.username(), request.password());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/reload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> reload() {
        String token = authService.reload();
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestParam String invitation, @RequestBody RegisterRequest request) {
        User user = invitationService.completeInvitation(invitation, request.username(), request.password(), request.name());
        String token = authService.authenticate(user.getUsername(), request.password());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    public record AuthResponse(String token) {
    }

    public record LoginRequest(String username, String password) {
    }

    public record RegisterRequest(String username, String password, String name) {
    }
}
