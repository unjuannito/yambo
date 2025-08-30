package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Invitation;
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
@RequestMapping("/admin/invitations")
@RequiredArgsConstructor
public class AdminInvitationController {

    private final InvitationService invitationService;

    @PostMapping
    @PreAuthorize("hasAuthority('INVITE_USERS')")
    public ResponseEntity<InvitationResponse> createInvitation(@Valid @RequestBody InvitationRequest req, Authentication authentication) {
        Long invitedBy = null;
        if (authentication != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                invitedBy = ((User) principal).getId();
            }
        }
        Invitation inv = invitationService.createInvitation(req.getEmail(), invitedBy);
        InvitationResponse res = new InvitationResponse(inv.getId(), inv.getEmail(), inv.getToken(), inv.getCreatedAt(), inv.getExpiresAt());
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @Data
    public static class InvitationRequest {
        @NotBlank
        @Email
        private String email;
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
