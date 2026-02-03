package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.PromotionInvitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.PromotionInvitationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/promotion-invitations")
@RequiredArgsConstructor
public class PromotionInvitationController {

    private final PromotionInvitationService promotionInvitationService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'create')")
    public ResponseEntity<PromotionInvitationResponse> createPromotionInvitation(
            @Valid @RequestBody PromotionInvitationRequest request) {
        User user = authService.getCurrentUser(true);
        PromotionInvitation invitation = promotionInvitationService.createPromotionInvitation(
            user.getId(),
            request.getFamilyProductIds(),
            request.getStartTms(),
            request.getEndTms());
        return ResponseEntity.status(HttpStatus.CREATED).body(new PromotionInvitationResponse(invitation));
    }

        @GetMapping
        @PreAuthorize("@permissionCheck.hasPermission('invitation', 'read')")
        public ResponseEntity<java.util.List<PromotionInvitationResponse>> listPromotionInvitations() {
        java.util.List<PromotionInvitation> invitations = promotionInvitationService.getAllInvitations();
        java.util.List<PromotionInvitationResponse> response = invitations.stream()
            .map(PromotionInvitationResponse::new)
            .collect(Collectors.toList());
        return ResponseEntity.ok(response);
        }

        @PutMapping("/{id}/disable")
        @PreAuthorize("@permissionCheck.hasPermission('invitation', 'update')")
        public ResponseEntity<PromotionInvitationResponse> disableInvitation(@PathVariable Long id) {
            PromotionInvitation invitation = promotionInvitationService.disableInvitation(id);
            return ResponseEntity.ok(new PromotionInvitationResponse(invitation));
        }

    @PostMapping("/{token}/accept")
    public ResponseEntity<AcceptPromotionResponse> acceptPromotionInvitation(
            @PathVariable String token,
            @Valid @RequestBody(required = false) AcceptPromotionRequest request) {
        User currentUser = authService.getCurrentUser(false);
        String email = request != null ? request.getEmail() : null;
        String password = request != null ? request.getPassword() : null;
        String name = request != null ? request.getName() : null;

        User user = promotionInvitationService.acceptInvitation(token, email, password, name, currentUser);
        return ResponseEntity.ok(new AcceptPromotionResponse(user.getId(), user.getEmail(), user.getName()));
    }

    @Data
    public static class PromotionInvitationRequest {
        @NotEmpty
        private Set<String> familyProductIds;

        private LocalDateTime startTms;

        private LocalDateTime endTms;
    }

    @Data
    public static class AcceptPromotionRequest {
        @Email
        private String email;
        private String password;
        private String name;
    }

    @Data
    @AllArgsConstructor
    public static class AcceptPromotionResponse {
        private String userId;
        private String email;
        private String name;
    }

    @Data
    public static class PromotionInvitationResponse {
        private Long id;
        private String token;
        private LocalDateTime createdAt;
        private LocalDateTime startTms;
        private LocalDateTime expiresAt;
        private String invitedBy;
        private Set<String> familyProductIds;

        public PromotionInvitationResponse(PromotionInvitation invitation) {
            this.id = invitation.getId();
            this.token = invitation.getToken();
            this.createdAt = invitation.getCreatedAt();
            this.startTms = invitation.getStartTms();
            this.expiresAt = invitation.getExpiresAt();
            this.invitedBy = invitation.getInvitedBy();
            this.familyProductIds = invitation.getFamilyProducts().stream()
                    .map(fp -> fp.getId())
                    .collect(Collectors.toSet());
        }
    }
}
