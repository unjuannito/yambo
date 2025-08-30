package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.service.InvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.Content;
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
@Tag(name = "Admin Invitations", description = "Operations for admin invitation management")
public class AdminInvitationController {

    private final InvitationService invitationService;

    @PostMapping
    @PreAuthorize("hasAuthority('INVITE_USERS')")
    @Operation(summary = "Create invitation", description = "Create an invitation for a user by email")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Invitation created", content = @Content(mediaType = "application/json")),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
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
    @Schema(description = "Email address to be invited", example = "user@example.com")
        @NotBlank
        @Email
        private String email;
    }

    @Data
    public static class InvitationResponse {
    @Schema(description = "Invitation id")
        private Long id;
    @Schema(description = "Invited email")
        private String email;
    @Schema(description = "Invitation token")
        private String token;
    @Schema(description = "Creation timestamp")
        private java.time.LocalDateTime createdAt;
    @Schema(description = "Expiration timestamp")
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
