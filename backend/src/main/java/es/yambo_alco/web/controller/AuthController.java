package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NominativeInvitationService;
import es.yambo_alco.web.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    private final NominativeInvitationService nominativeInvitationService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        String token = authService.authenticate(request.email(), request.password());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/reload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> reload() {
        String token = authService.reload();
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestParam String invitation, @RequestBody InvitationRegisterRequest request) {
        User user = nominativeInvitationService.completeInvitation(invitation, request.password(), request.name());
        String token = authService.authenticate(user.getUsername(), request.password());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    public record AuthResponse(String token) {
    }

    public record LoginRequest(String email, String password) {
    }

    public record InvitationRegisterRequest(String password, String name) {
    }

    // ── Password Reset ───────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.email());
        return ResponseEntity.ok(new MessageResponse("Si el email existe, recibirás un enlace para restablecer tu contraseña."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(new MessageResponse("Contraseña actualizada correctamente."));
    }

    public record ForgotPasswordRequest(String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 6) String newPassword) {
    }

    public record MessageResponse(String message) {
    }
}
