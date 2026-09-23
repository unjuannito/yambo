package es.yambo_alco.web.controller;

import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.ProjectRoleInvitation;
import es.yambo_alco.web.model.ProjectRoleInvitationUsage;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.ProjectRoleInvitationService;
import es.yambo_alco.web.service.SettingsService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
@RequestMapping("/project-role-invitations")
@RequiredArgsConstructor
public class ProjectRoleInvitationController {

    private final ProjectRoleInvitationService projectRoleInvitationService;
    private final AuthService authService;
    private final SettingsService settingsService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'create')")
    public ResponseEntity<ProjectRoleInvitationResponse> createInvitation(
            @RequestBody CreateProjectRoleInvitationRequest req,
            Authentication authentication) {
        User user = authService.getCurrentUser(true);

        ProjectRoleInvitation inv = projectRoleInvitationService.createInvitation(
                req.getProjectId(),
                req.getRole(),
                user.getId(),
                req.getEmail(),
                req.getExpiresAt(),
                req.getMaxUses());

        String domain = settingsService.getDomain();
        String link = projectRoleInvitationService.buildInvitationLink(inv.getToken(), domain);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(buildResponse(inv, link));
    }

    @PostMapping("/{token}/accept")
    public ResponseEntity<String> acceptInvitation(@PathVariable String token) {
        User currentUser = authService.getCurrentUser(true);
        projectRoleInvitationService.acceptInvitation(token, currentUser);
        return ResponseEntity.ok("Project role invitation accepted successfully");
    }

    /** Registra un usuario nuevo a través del link y le asigna el rol directamente. */
    @PostMapping("/{token}/register")
    public ResponseEntity<RegisterResponse> registerAndAccept(
            @PathVariable String token,
            @RequestBody RegisterRequest req) {
        User user = projectRoleInvitationService.registerAndAccept(
                token, req.getEmail(), req.getPassword(), req.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse(user.getId(), user.getEmail(), user.getName()));
    }

    @GetMapping("/{token}")
    public ResponseEntity<ProjectRoleInvitationInfo> getInvitationInfo(@PathVariable String token) {
        ProjectRoleInvitation inv = projectRoleInvitationService.getInvitationByToken(token);

        String projectName = projectRoleInvitationService.getProjectName(inv.getProjectId());

        return ResponseEntity.ok(new ProjectRoleInvitationInfo(
                inv.getId(),
                inv.getProjectId(),
                projectName,
                inv.getRole(),
                inv.isUsed(),
                inv.isExpired(),
                inv.isDisabled(),
                inv.getEmail(),
                inv.getMaxUses(),
                inv.getUsageCount()));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'read')")
    public ResponseEntity<List<ProjectRoleInvitationResponse>> getInvitations(
            @RequestParam(required = false) String projectId) {
        List<ProjectRoleInvitation> invitations = projectRoleInvitationService.getInvitations(projectId);
        String domain = settingsService.getDomain();
        List<ProjectRoleInvitationResponse> response = invitations.stream()
                .map(inv -> {
                    String link = projectRoleInvitationService.buildInvitationLink(inv.getToken(), domain);
                    return buildResponse(inv, link);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/usages")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'read')")
    public ResponseEntity<List<UsageResponse>> getUsages(@PathVariable Long id) {
        List<ProjectRoleInvitationUsage> usages = projectRoleInvitationService.getUsages(id);
        List<UsageResponse> response = usages.stream()
                .map(u -> new UsageResponse(
                        u.getUserId(),
                        u.getUserEmail(),
                        u.getUserName(),
                        u.isWasNewRegistration(),
                        u.getUsedAt()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /** Actualiza límites del link: maxUses, expiresAt, enabled. */
    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'update')")
    public ResponseEntity<ProjectRoleInvitationResponse> updateInvitation(
            @PathVariable Long id,
            @RequestBody UpdateInvitationRequest req) {
        ProjectRoleInvitation inv = projectRoleInvitationService.updateInvitation(
                id, req.getMaxUses(), req.getExpiresAt(), req.getEnabled());
        String domain = settingsService.getDomain();
        String link = projectRoleInvitationService.buildInvitationLink(inv.getToken(), domain);
        return ResponseEntity.ok(buildResponse(inv, link));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'delete')")
    public ResponseEntity<String> deleteInvitation(@PathVariable Long id) {
        projectRoleInvitationService.deleteInvitation(id);
        return ResponseEntity.ok("Project role invitation deleted successfully");
    }

    @DeleteMapping("/by-project/{projectId}/roles")
    @PreAuthorize("@permissionCheck.hasPermission('invitation', 'delete')")
    public ResponseEntity<String> revokeAllParentRolesByProject(@PathVariable String projectId) {
        int count = projectRoleInvitationService.revokeAllParentRolesByProject(projectId);
        return ResponseEntity.ok("Revoked " + count + " parent role(s) from project successfully");
    }

    @GetMapping("/parents")
    public ResponseEntity<List<ProjectParentsResponse>> listParents() {
        User currentUser = authService.getCurrentUser(true);
        var projectParents = projectRoleInvitationService.listParentsByAccessibleProjects(currentUser);
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

        projectRoleInvitationService.removeParentRole(projectId, userId);
        return ResponseEntity.ok("Parent role removed successfully");
    }

    private ProjectRoleInvitationResponse buildResponse(ProjectRoleInvitation inv, String invitationLink) {
        return new ProjectRoleInvitationResponse(
                inv.getId(),
                inv.getToken(),
                inv.getProjectId(),
                inv.getRole(),
                inv.getEmail(),
                inv.getCreatedBy(),
                inv.getCreatedAt(),
                inv.getExpiresAt(),
                inv.getUsedByUserId(),
                inv.getUsedAt(),
                inv.isUsed(),
                inv.isExpired(),
                inv.isDisabled(),
                inv.getMaxUses(),
                inv.getUsageCount(),
                invitationLink);
    }

    @Data
    public static class CreateProjectRoleInvitationRequest {
        @NotNull
        private String projectId;
        @NotNull
        private UserProjectGroupRole role;
        @Email
        private String email;
        private LocalDateTime expiresAt;
        private Integer maxUses;
    }

    @Data
    public static class UpdateInvitationRequest {
        private Integer maxUses;
        private LocalDateTime expiresAt;
        private Boolean enabled;
    }

    @Data
    public static class RegisterRequest {
        @NotNull @Email
        private String email;
        @NotNull @Size(min = 6)
        private String password;
        @NotNull
        private String name;
    }

    @Data
    @AllArgsConstructor
    public static class RegisterResponse {
        private String userId;
        private String email;
        private String name;
    }

    @Data
    @AllArgsConstructor
    public static class ProjectRoleInvitationResponse {
        private Long id;
        private String token;
        private String projectId;
        private UserProjectGroupRole role;
        private String email;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
        private String usedByUserId;
        private LocalDateTime usedAt;
        private boolean used;
        private boolean expired;
        private boolean disabled;
        private Integer maxUses;
        private Integer usageCount;
        private String invitationLink;
    }

    @Data
    @AllArgsConstructor
    public static class ProjectRoleInvitationInfo {
        private Long id;
        private String projectId;
        private String projectName;
        private UserProjectGroupRole role;
        private boolean used;
        private boolean expired;
        private boolean disabled;
        private String email;
        private Integer maxUses;
        private Integer usageCount;
    }

    @Data
    @AllArgsConstructor
    public static class UsageResponse {
        private String userId;
        private String userEmail;
        private String userName;
        private boolean wasNewRegistration;
        private LocalDateTime usedAt;
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
