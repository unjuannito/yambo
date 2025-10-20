package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.InvitationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import es.yambo_alco.web.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    private final AuthService authService;

    @PostMapping
    @PreAuthorize("hasAuthority('INVITE_USERS')")
    public ResponseEntity<InvitationResponse> createInvitation(@Valid @RequestBody InvitationRequest req, Authentication authentication) {
        User user = authService.getCurrentUser(true);

        Invitation inv = invitationService.createInvitation(req.getEmail(), req.getName(), user.getId());
        InvitationResponse res = new InvitationResponse(inv.getId(), inv.getEmail(), inv.getToken(), inv.getCreatedAt(), inv.getExpiresAt());
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @Data
    public static class InvitationRequest {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String name;
    }

    @Data
    public static class InvitationResponse {
        private Long id;
        private String email;
        private String token;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime expiresAt;

        public InvitationResponse(Long id, String email, String token, java.time.LocalDateTime createdAt, java.time.LocalDateTime expiresAt) {
            this.id = id;
            this.email = email;
            this.token = token;
            this.createdAt = createdAt;
            this.expiresAt = expiresAt;
        }
    }
}
