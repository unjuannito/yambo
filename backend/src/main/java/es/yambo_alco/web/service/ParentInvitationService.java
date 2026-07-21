package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParentInvitationService {

    private final ParentInvitationRepository parentInvitationRepository;
    private final FamilyProductRepository familyProductRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final UserProjectGroupRepository userProjectGroupRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ParentInvitation createInvitation(String familyProductId, String createdBy,
                                              String email, LocalDateTime expiresAt) {
        FamilyProduct product = familyProductRepository.findById(familyProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));

        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();

        ParentInvitation inv = ParentInvitation.builder()
                .token(token)
                .familyProductId(familyProductId)
                .email(email != null ? email.toLowerCase().trim() : null)
                .createdBy(createdBy)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        return parentInvitationRepository.save(inv);
    }

    @Transactional
    public void acceptInvitation(String token, User currentUser) {
        ParentInvitation invitation = parentInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Parent invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("This invitation has already been used");
        }

        if (invitation.isExpired()) {
            throw new BadRequestException("This invitation has expired");
        }

        // Get the family product's roleAccess to find which projects need PARENT
        FamilyProduct product = familyProductRepository.findById(invitation.getFamilyProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));

        if (product.getRoleAccess() == null || product.getRoleAccess().isEmpty()) {
            throw new BadRequestException("This family product has no role access configured");
        }

        // Assign PARENT role for each project that has PARENT in its roleAccess
        boolean assigned = false;
        for (FamilyProductRoleAccess ra : product.getRoleAccess()) {
            if (ra.getRole() == UserProjectGroupRole.PARENT) {
                ProjectGroup projectGroup = projectGroupRepository
                        .findByProjectIdAndNameIsNull(ra.getProjectId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Project-level group not found for project: " + ra.getProjectId()));

                userService.assignGroupRole(currentUser.getId(), projectGroup.getId(),
                        UserProjectGroupRole.PARENT);
                assigned = true;
            }
        }

        if (!assigned) {
            throw new BadRequestException("This family product does not allow parent access");
        }

        // Mark invitation as used
        invitation.setUsedByUserId(currentUser.getId());
        invitation.setUsedAt(LocalDateTime.now());
        parentInvitationRepository.save(invitation);
    }

    public List<ParentInvitation> getInvitations(String familyProductId) {
        if (familyProductId != null && !familyProductId.isBlank()) {
            return parentInvitationRepository.findByFamilyProductId(familyProductId);
        }
        return parentInvitationRepository.findAll();
    }

    @Transactional
    public void deleteInvitation(Long id) {
        ParentInvitation invitation = parentInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parent invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("Cannot delete a used invitation");
        }

        parentInvitationRepository.delete(invitation);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "parent_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String buildInvitationLink(String token, String domain) {
        return domain + "/parent-invitation/" + token;
    }

    public String getFamilyProductName(String familyProductId) {
        return familyProductRepository.findById(familyProductId)
                .map(FamilyProduct::getName)
                .orElse("Unknown");
    }

    @Transactional
    public int revokeAllParentRolesByProject(String projectId) {
        ProjectGroup projectGroup = projectGroupRepository
                .findByProjectIdAndNameIsNull(projectId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project-level group not found for project: " + projectId));

        List<es.yambo_alco.web.model.UserProjectGroup> parents =
                userProjectGroupRepository.findByProjectGroupIdAndRole(
                        projectGroup.getId(), UserProjectGroupRole.PARENT);

        if (!parents.isEmpty()) {
            userProjectGroupRepository.deleteAll(parents);
        }
        return parents.size();
    }

    // ── DTO classes for parent management ────────────────────────────

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class ParentInfo {
        private String userId;
        private String name;
        private String email;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class ProjectParents {
        private String projectId;
        private String projectName;
        private List<ParentInfo> parents;
    }

    @Transactional(readOnly = true)
    public List<ProjectParents> listParentsByAccessibleProjects(User currentUser) {
        boolean hasGlobalAccess = currentUser.getProfiles().stream()
                .flatMap(p -> p.getPermissions().stream())
                .anyMatch(perm -> "family_product".equals(perm.getResource().getValue())
                        && "read".equals(perm.getAction().getValue()));

        Set<String> accessibleProjectIds;
        if (hasGlobalAccess) {
            // Admin/Merch: all active projects
            accessibleProjectIds = projectRepository.findAll().stream()
                    .map(Project::getId)
                    .collect(Collectors.toSet());
        } else {
            // Monitor/Coordinator: only their projects
            accessibleProjectIds = currentUser.getGroupRoles().stream()
                    .filter(gr -> gr.getRole() == UserProjectGroupRole.MONITOR
                            || gr.getRole() == UserProjectGroupRole.COORDINATOR)
                    .map(gr -> gr.getProjectGroup().getProject().getId())
                    .collect(Collectors.toSet());
        }

        List<ProjectParents> result = new ArrayList<>();
        for (String projectId : accessibleProjectIds) {
            Optional<ProjectGroup> projectGroupOpt = projectGroupRepository
                    .findByProjectIdAndNameIsNull(projectId);
            if (projectGroupOpt.isEmpty()) continue;

            ProjectGroup projectGroup = projectGroupOpt.get();
            List<UserProjectGroup> parentRoles = userProjectGroupRepository
                    .findByProjectGroupIdAndRole(projectGroup.getId(), UserProjectGroupRole.PARENT);

            if (parentRoles.isEmpty()) continue;

            Project project = projectRepository.findById(projectId).orElse(null);
            String projectName = project != null ? project.getName() : projectId;

            List<ParentInfo> parents = parentRoles.stream()
                    .map(upg -> {
                        String name = upg.getUser().getName();
                        String email = upg.getUser().getEmail();
                        return new ParentInfo(upg.getUser().getId(), name, email);
                    })
                    .collect(Collectors.toList());

            result.add(new ProjectParents(projectId, projectName, parents));
        }

        return result;
    }

    @Transactional
    public void removeParentRole(String projectId, String userId) {
        ProjectGroup projectGroup = projectGroupRepository
                .findByProjectIdAndNameIsNull(projectId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Project-level group not found for project: " + projectId));

        userProjectGroupRepository.deleteByUserIdAndProjectGroupIdAndRole(
                userId, projectGroup.getId(), UserProjectGroupRole.PARENT);
    }
}
