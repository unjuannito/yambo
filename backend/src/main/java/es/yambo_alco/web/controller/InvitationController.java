package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.InvitationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'create')")
    public ResponseEntity<InvitationResponse> createInvitation(
            @Valid @RequestBody InvitationRequest request) {
        User user = authService.getCurrentUser(true);
        Invitation invitation = invitationService.createInvitation(
            user.getId(),
            request.getProfileIds(),
            request.getStartTms(),
            request.getEndTms());
        return ResponseEntity.status(HttpStatus.CREATED).body(new InvitationResponse(invitation));
    }

        @GetMapping
        @PreAuthorize("@permissionCheck.hasPermission('invitation', 'read')")
        public ResponseEntity<java.util.List<InvitationResponse>> listInvitations(
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate) {
        java.util.List<Invitation> invitations = invitationService.getInvitationsSince(startDate);
        java.util.List<InvitationResponse> response = invitations.stream()
            .map(InvitationResponse::new)
            .collect(Collectors.toList());
        return ResponseEntity.ok(response);
        }

        @PutMapping("/{id}/disable")
        @PreAuthorize("@permissionCheck.hasPermission('invitation', 'update')")
        public ResponseEntity<InvitationResponse> disableInvitation(@PathVariable Long id) {
            Invitation invitation = invitationService.disableInvitation(id);
            return ResponseEntity.ok(new InvitationResponse(invitation));
        }

    @PostMapping("/{token}/accept")
    public ResponseEntity<AcceptInvitationResponse> acceptInvitation(
            @PathVariable String token,
            @Valid @RequestBody(required = false) AcceptInvitationRequest request) {
        User currentUser = authService.getCurrentUser(false);
        String email = request != null ? request.getEmail() : null;
        String password = request != null ? request.getPassword() : null;
        String name = request != null ? request.getName() : null;

        User user = invitationService.acceptInvitation(token, email, password, name, currentUser);
        return ResponseEntity.ok(new AcceptInvitationResponse(user.getId(), user.getEmail(), user.getName()));
    }

    @Data
    public static class InvitationRequest {
        @NotEmpty
        private Set<String> profileIds;

        private LocalDateTime startTms;

        private LocalDateTime endTms;
    }

    @Data
    public static class AcceptInvitationRequest {
        @Email
        private String email;
        private String password;
        private String name;
    }

    @Data
    @AllArgsConstructor
    public static class AcceptInvitationResponse {
        private String userId;
        private String email;
        private String name;
    }

    @Data
    public static class InvitationResponse {
        private Long id;
        private String token;
        private LocalDateTime createdAt;
        private LocalDateTime startTms;
        private LocalDateTime expiresAt;
        private String invitedBy;
        private Set<String> profileIds;

        public InvitationResponse(Invitation invitation) {
            this.id = invitation.getId();
            this.token = invitation.getToken();
            this.createdAt = invitation.getCreatedAt();
            this.startTms = invitation.getStartTms();
            this.expiresAt = invitation.getExpiresAt();
            this.invitedBy = invitation.getInvitedBy();
                this.profileIds = invitation.getProfiles().stream()
                    .map(profile -> profile.getId())
                    .collect(Collectors.toSet());
        }
    }
}
