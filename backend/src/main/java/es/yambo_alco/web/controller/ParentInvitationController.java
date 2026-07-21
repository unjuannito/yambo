package es.yambo_alco.web.controller;

import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.ParentInvitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.ParentInvitationService;
import es.yambo_alco.web.service.SettingsService;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/parent-invitations")
@RequiredArgsConstructor
public class ParentInvitationController {

    private final ParentInvitationService parentInvitationService;
    private final AuthService authService;
    private final SettingsService settingsService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'create')")
    public ResponseEntity<ParentInvitationResponse> createInvitation(
            @RequestBody CreateParentInvitationRequest req,
            Authentication authentication) {
        User user = authService.getCurrentUser(true);

        ParentInvitation inv = parentInvitationService.createInvitation(
                req.getFamilyProductId(),
                user.getId(),
                req.getEmail(),
                req.getExpiresAt());

        String domain = settingsService.getDomain();
        String link = parentInvitationService.buildInvitationLink(inv.getToken(), domain);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(buildResponse(inv, link));
    }

    @PostMapping("/{token}/accept")
    public ResponseEntity<String> acceptInvitation(@PathVariable String token) {
        User currentUser = authService.getCurrentUser(true);
        parentInvitationService.acceptInvitation(token, currentUser);
        return ResponseEntity.ok("Parent invitation accepted successfully");
    }

    @GetMapping("/{token}")
    public ResponseEntity<ParentInvitationInfo> getInvitationInfo(@PathVariable String token) {
        // Public endpoint to get basic info about an invitation (for the acceptance page)
        var invitations = parentInvitationService.getInvitations(null);
        ParentInvitation inv = invitations.stream()
                .filter(i -> i.getToken().equals(token))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Parent invitation not found"));

        String familyProductName = parentInvitationService.getFamilyProductName(inv.getFamilyProductId());

        return ResponseEntity.ok(new ParentInvitationInfo(
                inv.getFamilyProductId(),
                familyProductName,
                inv.isUsed(),
                inv.isExpired(),
                inv.getEmail()));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'read')")
    public ResponseEntity<List<ParentInvitationResponse>> getInvitations(
            @RequestParam(required = false) String familyProductId) {
        List<ParentInvitation> invitations = parentInvitationService.getInvitations(familyProductId);
        String domain = settingsService.getDomain();
        List<ParentInvitationResponse> response = invitations.stream()
                .map(inv -> {
                    String link = parentInvitationService.buildInvitationLink(inv.getToken(), domain);
                    return buildResponse(inv, link);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'delete')")
    public ResponseEntity<String> deleteInvitation(@PathVariable Long id) {
        parentInvitationService.deleteInvitation(id);
        return ResponseEntity.ok("Parent invitation deleted successfully");
    }

    @DeleteMapping("/by-project/{projectId}/roles")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'delete')")
    public ResponseEntity<String> revokeAllParentRolesByProject(@PathVariable String projectId) {
        int count = parentInvitationService.revokeAllParentRolesByProject(projectId);
        return ResponseEntity.ok("Revoked " + count + " parent role(s) from project successfully");
    }

    @GetMapping("/parents")
    public ResponseEntity<List<ProjectParentsResponse>> listParents() {
        User currentUser = authService.getCurrentUser(true);
        var projectParents = parentInvitationService.listParentsByAccessibleProjects(currentUser);
        List<ProjectParentsResponse> response = projectParents.stream()
                .map(pp -> new ProjectParentsResponse(
                        pp.getProjectId(),
                        pp.getProjectName(),
                        pp.getParents().stream()
                                .map(p -> new ParentInfoResponse(p.getUserId(), p.getName(), p.getEmail()))
                                .collect(Collectors.toList())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/parents/{projectId}/{userId}")
    public ResponseEntity<String> removeParentRole(@PathVariable String projectId,
                                                     @PathVariable String userId) {
        User currentUser = authService.getCurrentUser(true);
        boolean canManage = currentUser.getProfiles().stream()
                .flatMap(p -> p.getPermissions().stream())
                .anyMatch(perm -> "family_product".equals(perm.getResource().getValue())
                        && "update".equals(perm.getAction().getValue()));
        boolean isCoordinator = currentUser.getGroupRoles().stream()
                .anyMatch(gr -> gr.getRole() == UserProjectGroupRole.COORDINATOR
                        && gr.getProjectGroup().getProject().getId().equals(projectId));

        if (!canManage && !isCoordinator) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized");
        }

        parentInvitationService.removeParentRole(projectId, userId);
        return ResponseEntity.ok("Parent role removed successfully");
    }

    private ParentInvitationResponse buildResponse(ParentInvitation inv, String invitationLink) {
        return new ParentInvitationResponse(
                inv.getId(),
                inv.getToken(),
                inv.getFamilyProductId(),
                inv.getEmail(),
                inv.getCreatedBy(),
                inv.getCreatedAt(),
                inv.getExpiresAt(),
                inv.getUsedByUserId(),
                inv.getUsedAt(),
                inv.isUsed(),
                inv.isExpired(),
                invitationLink);
    }

    @Data
    public static class CreateParentInvitationRequest {
        private String familyProductId;
        @Email
        private String email;
        private LocalDateTime expiresAt;
    }

    @Data
    @AllArgsConstructor
    public static class ParentInvitationResponse {
        private Long id;
        private String token;
        private String familyProductId;
        private String email;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
        private String usedByUserId;
        private LocalDateTime usedAt;
        private boolean used;
        private boolean expired;
        private String invitationLink;
    }

    @Data
    @AllArgsConstructor
    public static class ParentInvitationInfo {
        private String familyProductId;
        private String familyProductName;
        private boolean used;
        private boolean expired;
        private String email;
    }

    @Data
    @AllArgsConstructor
    public static class ParentInfoResponse {
        private String userId;
        private String name;
        private String email;
    }

    @Data
    @AllArgsConstructor
    public static class ProjectParentsResponse {
        private String projectId;
        private String projectName;
        private List<ParentInfoResponse> parents;
    }
}
