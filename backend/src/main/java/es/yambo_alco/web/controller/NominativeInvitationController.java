package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.NominativeInvitation;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.BatchEmailService;
import es.yambo_alco.web.service.NominativeInvitationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/nominative-invitations")
@RequiredArgsConstructor
public class NominativeInvitationController {

    private final NominativeInvitationService nominativeInvitationService;

    private final AuthService authService;

    private final UserRepository userRepository;

    private final BatchEmailService batchEmailService;

    private NominativeInvitationResponse buildInvitationResponse(NominativeInvitation inv) {
        UserInfo invitedByUser = null;
        if (inv.getInvitedBy() != null) {
            invitedByUser = userRepository.findById(inv.getInvitedBy())
                    .map(u -> new UserInfo(u.getId(), u.getUsername(), u.getName(), u.getEmail()))
                    .orElse(null);
        }

        // Beneficiario: quién usó la invitación (si se ha completado el registro)
        UserInfo usedByUser = null;
        if (inv.getUsedByUserId() != null) {
            usedByUser = userRepository.findById(inv.getUsedByUserId())
                    .map(u -> new UserInfo(u.getId(), u.getUsername(), u.getName(), u.getEmail()))
                    .orElse(null);
        }

        return new NominativeInvitationResponse(
                inv.getId(),
                inv.getEmail(),
                inv.getToken(),
                inv.getCreatedAt(),
                inv.getExpiresAt(),
                inv.isUsed(),
                inv.getInvitedBy(),
                invitedByUser,
                inv.getProfiles().stream().map(Profile::getId).collect(Collectors.toSet()),
                usedByUser,
                inv.getUsedAt()
        );
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'create')")
    public ResponseEntity<NominativeInvitationResponse> createInvitation(@Valid @RequestBody NominativeInvitationRequest req, Authentication authentication) {
        User user = authService.getCurrentUser(true);

        var result = nominativeInvitationService.createInvitation(req.getEmail(), user.getId(), req.getProfileIds());
        NominativeInvitationResponse res = buildInvitationResponse(result);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PostMapping("/batch")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'create')")
    public ResponseEntity<BatchInvitationResponse> createBatchInvitations(
            @Valid @RequestBody BatchInvitationRequest req, Authentication authentication) {
        User user = authService.getCurrentUser(true);

        List<NominativeInvitation> invitations = nominativeInvitationService
                .createBatchInvitations(req.getEmails(), user.getId(), req.getProfileIds());

        String batchId = UUID.randomUUID().toString();
        batchEmailService.processBatchInvitations(batchId, user.getUsername(), invitations);

        List<NominativeInvitationResponse> created = invitations.stream()
                .map(this::buildInvitationResponse)
                .collect(Collectors.toList());

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new BatchInvitationResponse(batchId, created));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'read')")
    public ResponseEntity<List<NominativeInvitationResponse>> getAllInvitations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate) {
        List<NominativeInvitation> invitations = nominativeInvitationService.getInvitationsSince(startDate);
        List<NominativeInvitationResponse> response = invitations.stream()
                .map(inv -> buildInvitationResponse(inv))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'delete')")
    public ResponseEntity<String> deleteInvitation(@PathVariable Long id) {
        nominativeInvitationService.deleteInvitation(id);
        return ResponseEntity.ok("Invitation deleted successfully");
    }

    @Data
    public static class NominativeInvitationRequest {
        @NotBlank
        @Email
        private String email;

        private String name;

        private Set<String> profileIds;
    }
    @Data
    @AllArgsConstructor
    public static class NominativeInvitationResponse {
        private Long id;
        private String email;
        private String token;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
        private boolean used;
        private String invitedBy;
        private UserInfo invitedByUser;
        private Set<String> profileIds;
        private UserInfo usedByUser;
        private LocalDateTime usedAt;
    }
    @Data
    @AllArgsConstructor
    public static class UserInfo {
        private String id;
        private String username;
        private String name;
        private String email;
    }

    @Data
    public static class BatchInvitationRequest {
        @NotEmpty
        private List<@Email @NotBlank String> emails;
        private Set<String> profileIds;
    }

    @Data
    @AllArgsConstructor
    public static class BatchInvitationResponse {
        private String batchId;
        private List<NominativeInvitationResponse> invitations;
    }
}
