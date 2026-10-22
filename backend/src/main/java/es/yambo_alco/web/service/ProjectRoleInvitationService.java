package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.InvitationType;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectRoleInvitationService {

    private static final String TOKEN_ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int TOKEN_LENGTH = 20;

    private final ProjectRoleInvitationRepository projectRoleInvitationRepository;
    private final ProjectRoleInvitationUsageRepository projectRoleInvitationUsageRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final UserProjectGroupRepository userProjectGroupRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProfileRepository profileRepository;
    private final UserService userService;
    private final AccessGrantService accessGrantService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ProjectRoleInvitation createInvitation(String projectId, UserProjectGroupRole role,
                                                   String createdBy, String email,
                                                   LocalDateTime expiresAt, Integer maxUses) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (maxUses != null && maxUses < 1) {
            throw new BadRequestException("Max uses must be at least 1");
        }

        String token = generateUniqueToken();
        LocalDateTime now = LocalDateTime.now();

        ProjectRoleInvitation inv = ProjectRoleInvitation.builder()
                .token(token)
                .projectId(project.getId())
                .role(role)
                .email(email != null ? email.toLowerCase().trim() : null)
                .createdBy(createdBy)
                .createdAt(now)
                .expiresAt(expiresAt)
                .maxUses(maxUses)
                .usageCount(0)
                .enabled(true)
                .build();

        return projectRoleInvitationRepository.save(inv);
    }

    @Transactional
    public void acceptInvitation(String token, User currentUser) {
        ProjectRoleInvitation invitation = findByTokenOrThrow(token);

        validateUsable(invitation);

        ProjectGroup projectGroup = getOrCreateProjectLevelGroup(invitation.getProjectId());

        userService.assignGroupRole(currentUser.getId(), projectGroup.getId(), invitation.getRole());

        invitation.setUsedByUserId(currentUser.getId());
        invitation.setUsedAt(LocalDateTime.now());
        invitation.setUsageCount(invitation.getUsageCount() + 1);
        projectRoleInvitationRepository.save(invitation);

        recordUsage(invitation, currentUser, false);

        // Historial: rol de grupo obtenido a través de esta invitación (origen INVITATION/PROJECT_ROLE)
        accessGrantService.recordInvitationGroupRoleGrant(
                currentUser.getId(), invitation.getId(), InvitationType.PROJECT_ROLE,
                projectGroup.getId(), invitation.getRole(), invitation.getCreatedBy());
    }

    /**
     * Registra un usuario nuevo a través del link de invitación y le asigna el rol.
     * El usuario se crea con el perfil base USER y se registra el uso como
     * "nuevo registro" (wasNewRegistration = true).
     */
    @Transactional
    public User registerAndAccept(String token, String email, String password, String name) {
        ProjectRoleInvitation invitation = findByTokenOrThrow(token);

        validateUsable(invitation);

        String normalizedEmail = email.toLowerCase().trim();
        // Someone added without an account who registers with the same email keeps that user
        Optional<User> pending = userRepository.findPendingAccountByEmail(normalizedEmail);
        if (pending.isEmpty() && userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Email already registered");
        }

        Set<Profile> baseProfiles = new HashSet<>(profileRepository.findAllById(List.of("USER")));

        User user;
        if (pending.isPresent()) {
            user = pending.get();
            user.activateAccount(passwordEncoder.encode(password));
            if (user.getProfiles() == null) {
                user.setProfiles(new HashSet<>());
            }
            user.getProfiles().addAll(baseProfiles);
        } else {
            user = User.builder()
                    .email(normalizedEmail)
                    .password(passwordEncoder.encode(password))
                    .name(name)
                    .createdAt(LocalDateTime.now())
                    .enabled(true)
                    .profiles(new HashSet<>(baseProfiles))
                    .build();
        }
        user = userRepository.save(user);

        ProjectGroup projectGroup = getOrCreateProjectLevelGroup(invitation.getProjectId());
        userService.assignGroupRole(user.getId(), projectGroup.getId(), invitation.getRole());

        invitation.setUsedByUserId(user.getId());
        invitation.setUsedAt(LocalDateTime.now());
        invitation.setUsageCount(invitation.getUsageCount() + 1);
        projectRoleInvitationRepository.save(invitation);

        recordUsage(invitation, user, true);

        // Historial: rol de grupo obtenido a través de esta invitación (origen INVITATION/PROJECT_ROLE)
        accessGrantService.recordInvitationGroupRoleGrant(
                user.getId(), invitation.getId(), InvitationType.PROJECT_ROLE,
                projectGroup.getId(), invitation.getRole(), invitation.getCreatedBy());

        return user;
    }

    private void validateUsable(ProjectRoleInvitation invitation) {
        if (invitation.isDisabled()) {
            throw new BadRequestException("This invitation is disabled");
        }
        if (invitation.isExpired()) {
            throw new BadRequestException("This invitation has expired");
        }
        if (invitation.isUsed()) {
            throw new BadRequestException("This invitation has reached its maximum number of uses");
        }
    }

    private void recordUsage(ProjectRoleInvitation invitation, User user, boolean wasNewRegistration) {
        ProjectRoleInvitationUsage usage = ProjectRoleInvitationUsage.builder()
                .invitationId(invitation.getId())
                .userId(user.getId())
                .userEmail(user.getEmail())
                .userName(user.getName())
                .wasNewRegistration(wasNewRegistration)
                .usedAt(LocalDateTime.now())
                .build();
        projectRoleInvitationUsageRepository.save(usage);
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

    public ProjectRoleInvitation getInvitationByToken(String token) {
        return findByTokenOrThrow(token);
    }

    public List<ProjectRoleInvitationUsage> getUsages(Long invitationId) {
        return projectRoleInvitationUsageRepository.findByInvitationIdOrderByUsedAtDesc(invitationId);
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

    /** Actualiza límites del link: maxUses, expiresAt y enabled (deshabilitar/habilitar). */
    @Transactional
    public ProjectRoleInvitation updateInvitation(Long id, Integer maxUses,
                                                  LocalDateTime expiresAt, Boolean enabled) {
        ProjectRoleInvitation invitation = projectRoleInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project role invitation not found"));

        if (maxUses != null) {
            if (maxUses < 1) {
                throw new BadRequestException("Max uses must be at least 1");
            }
            invitation.setMaxUses(maxUses);
        }
        if (expiresAt != null) {
            invitation.setExpiresAt(expiresAt);
        }
        if (enabled != null) {
            invitation.setEnabled(enabled);
        }

        return projectRoleInvitationRepository.save(invitation);
    }

    private ProjectRoleInvitation findByTokenOrThrow(String token) {
        return projectRoleInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Project role invitation not found"));
    }

    private String generateUniqueToken() {
        String token;
        do {
            token = generateToken();
        } while (projectRoleInvitationRepository.findByToken(token).isPresent());
        return token;
    }

    private String generateToken() {
        StringBuilder sb = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            sb.append(TOKEN_ALPHABET.charAt(secureRandom.nextInt(TOKEN_ALPHABET.length())));
        }
        return sb.toString();
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
                    .filter(gr -> gr.getRole().isStaff())
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
