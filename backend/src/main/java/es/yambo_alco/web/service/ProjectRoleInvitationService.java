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
public class ProjectRoleInvitationService {

    private final ProjectRoleInvitationRepository projectRoleInvitationRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final UserProjectGroupRepository userProjectGroupRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ProjectRoleInvitation createInvitation(String projectId, UserProjectGroupRole role,
                                                   String createdBy, String email, LocalDateTime expiresAt) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();

        ProjectRoleInvitation inv = ProjectRoleInvitation.builder()
                .token(token)
                .projectId(project.getId())
                .role(role)
                .email(email != null ? email.toLowerCase().trim() : null)
                .createdBy(createdBy)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        return projectRoleInvitationRepository.save(inv);
    }

    @Transactional
    public void acceptInvitation(String token, User currentUser) {
        ProjectRoleInvitation invitation = projectRoleInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Project role invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("This invitation has already been used");
        }

        if (invitation.isExpired()) {
            throw new BadRequestException("This invitation has expired");
        }

        ProjectGroup projectGroup = getOrCreateProjectLevelGroup(invitation.getProjectId());

        userService.assignGroupRole(currentUser.getId(), projectGroup.getId(), invitation.getRole());

        invitation.setUsedByUserId(currentUser.getId());
        invitation.setUsedAt(LocalDateTime.now());
        projectRoleInvitationRepository.save(invitation);
    }

    private ProjectGroup getOrCreateProjectLevelGroup(String projectId) {
        return projectGroupRepository.findByProjectIdAndNameIsNull(projectId)
                .orElseGet(() -> {
                    Project project = projectRepository.findById(projectId)
                            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
                    ProjectGroup group = new ProjectGroup();
                    group.setName(null);
                    group.setProject(project);
                    return projectGroupRepository.save(group);
                });
    }

    public List<ProjectRoleInvitation> getInvitations(String projectId) {
        if (projectId != null && !projectId.isBlank()) {
            return projectRoleInvitationRepository.findByProjectId(projectId);
        }
        return projectRoleInvitationRepository.findAll();
    }

    @Transactional
    public void deleteInvitation(Long id) {
        ProjectRoleInvitation invitation = projectRoleInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project role invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("Cannot delete a used invitation");
        }

        projectRoleInvitationRepository.delete(invitation);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "prj_role_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String buildInvitationLink(String token, String domain) {
        return domain + "/project-role-invitation/" + token;
    }

    public String getProjectName(String projectId) {
        return projectRepository.findById(projectId)
                .map(Project::getName)
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
