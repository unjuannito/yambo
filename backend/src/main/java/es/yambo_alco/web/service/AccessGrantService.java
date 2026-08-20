package es.yambo_alco.web.service;

import es.yambo_alco.web.model.AccessGrant;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.GrantSource;
import es.yambo_alco.web.model.enums.GrantType;
import es.yambo_alco.web.model.enums.InvitationType;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.AccessGrantRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Registra y consulta el ORIGEN de cada concesión de acceso (perfil o rol de grupo):
 * quién la otorgó (granted_by), cómo (source) y, si fue por invitación, de qué tipo y cuál.
 */
@Service
@RequiredArgsConstructor
public class AccessGrantService {

    private final AccessGrantRepository accessGrantRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ProjectGroupRepository projectGroupRepository;

    // ── Registro ──────────────────────────────────────────────────────────

    /** Asignación manual de un perfil por una persona (admin/coordinador). */
    @Transactional
    public void recordManualProfileGrant(String userId, String profileId, String grantedBy) {
        AccessGrant grant = AccessGrant.builder()
                .userId(userId)
                .grantType(GrantType.PROFILE)
                .profileId(profileId)
                .source(GrantSource.MANUAL)
                .grantedBy(grantedBy)
                .grantedAt(LocalDateTime.now())
                .build();
        accessGrantRepository.save(grant);
    }

    /** Asignación manual de un rol de grupo por una persona. */
    @Transactional
    public void recordManualGroupRoleGrant(String userId, String projectGroupId,
                                           UserProjectGroupRole role, String grantedBy) {
        AccessGrant grant = AccessGrant.builder()
                .userId(userId)
                .grantType(GrantType.GROUP_ROLE)
                .projectGroupId(projectGroupId)
                .role(role)
                .source(GrantSource.MANUAL)
                .grantedBy(grantedBy)
                .grantedAt(LocalDateTime.now())
                .build();
        accessGrantRepository.save(grant);
    }

    /** Perfiles obtenidos a través de una invitación (LINK o NOMINATIVE). grantedBy = quien creó la invitación. */
    @Transactional
    public void recordInvitationProfileGrants(String userId, Long invitationId, InvitationType invitationType,
                                              Set<Profile> profiles, String grantedBy) {
        if (profiles == null || profiles.isEmpty()) return;
        LocalDateTime now = LocalDateTime.now();
        for (Profile profile : profiles) {
            // Dedupe: si ya existe la misma concesión vigente, no duplicar
            boolean exists = accessGrantRepository
                    .findFirstByUserIdAndGrantTypeAndProfileIdAndSourceAndInvitationTypeAndInvitationIdAndRevokedAtIsNull(
                            userId, GrantType.PROFILE, profile.getId(), GrantSource.INVITATION,
                            invitationType, invitationId)
                    .isPresent();
            if (exists) continue;
            accessGrantRepository.save(AccessGrant.builder()
                    .userId(userId)
                    .grantType(GrantType.PROFILE)
                    .profileId(profile.getId())
                    .source(GrantSource.INVITATION)
                    .invitationType(invitationType)
                    .invitationId(invitationId)
                    .grantedBy(grantedBy)
                    .grantedAt(now)
                    .build());
        }
    }

    /** Rol de grupo obtenido a través de una invitación (PROJECT_ROLE). */
    @Transactional
    public void recordInvitationGroupRoleGrant(String userId, Long invitationId, InvitationType invitationType,
                                               String projectGroupId, UserProjectGroupRole role, String grantedBy) {
        boolean exists = accessGrantRepository
                .findFirstByUserIdAndGrantTypeAndProjectGroupIdAndRoleAndSourceAndInvitationTypeAndInvitationIdAndRevokedAtIsNull(
                        userId, GrantType.GROUP_ROLE, projectGroupId, role,
                        GrantSource.INVITATION, invitationType, invitationId)
                .isPresent();
        if (exists) return;
        accessGrantRepository.save(AccessGrant.builder()
                .userId(userId)
                .grantType(GrantType.GROUP_ROLE)
                .projectGroupId(projectGroupId)
                .role(role)
                .source(GrantSource.INVITATION)
                .invitationType(invitationType)
                .invitationId(invitationId)
                .grantedBy(grantedBy)
                .grantedAt(LocalDateTime.now())
                .build());
    }

    // ── Revocación ────────────────────────────────────────────────────────

    /** Retira la concesión de un perfil (marca revoked_at en las vigentes). */
    @Transactional
    public void revokeProfileGrants(String userId, String profileId) {
        accessGrantRepository.revokeActiveProfileGrants(userId, profileId, LocalDateTime.now());
    }

    /** Retira la concesión de un rol de grupo. */
    @Transactional
    public void revokeGroupRoleGrants(String userId, String projectGroupId, UserProjectGroupRole role) {
        accessGrantRepository.revokeActiveGroupRoleGrants(userId, projectGroupId, role, LocalDateTime.now());
    }

    // ── Consulta ──────────────────────────────────────────────────────────

    /** Historial completo de concesiones de un usuario, enriquecido con nombres legibles. */
    @Transactional(readOnly = true)
    public List<AccessGrantDto> getUserHistory(String userId) {
        return accessGrantRepository.findByUserIdOrderByGrantedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    /** Historial enriquecido de una invitación concreta (para la tabla de invitaciones). */
    @Transactional(readOnly = true)
    public List<AccessGrantDto> getInvitationHistory(InvitationType invitationType, Long invitationId) {
        return accessGrantRepository
                .findByInvitationTypeAndInvitationIdOrderByGrantedAtDesc(invitationType, invitationId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private AccessGrantDto toDto(AccessGrant grant) {
        String profileName = null;
        if (grant.getProfileId() != null) {
            profileName = profileRepository.findById(grant.getProfileId())
                    .map(Profile::getName).orElse(null);
        }
        String groupName = null;
        String projectName = null;
        if (grant.getProjectGroupId() != null) {
            groupName = projectGroupRepository.findById(grant.getProjectGroupId())
                    .map(pg -> pg.getName() != null ? pg.getName() : pg.getProject().getName())
                    .orElse(null);
            projectName = projectGroupRepository.findById(grant.getProjectGroupId())
                    .map(pg -> pg.getProject().getName())
                    .orElse(null);
        }
        String grantedByName = null;
        if (grant.getGrantedBy() != null) {
            grantedByName = userRepository.findById(grant.getGrantedBy())
                    .map(User::getName).orElse(null);
        }
        return new AccessGrantDto(grant, profileName, groupName, projectName, grantedByName);
    }

    /** DTO plano para API/UI. */
    @lombok.Data
    public static class AccessGrantDto {
        private final Long id;
        private final String userId;
        private final String grantType;
        private final String profileId;
        private final String profileName;
        private final String projectGroupId;
        private final String groupName;
        private final String projectName;
        private final String role;
        private final String source;
        private final String invitationType;
        private final Long invitationId;
        private final String grantedBy;
        private final String grantedByName;
        private final String grantedAt;
        private final String revokedAt;

        public AccessGrantDto(AccessGrant g, String profileName, String groupName,
                              String projectName, String grantedByName) {
            this.id = g.getId();
            this.userId = g.getUserId();
            this.grantType = g.getGrantType() != null ? g.getGrantType().name() : null;
            this.profileId = g.getProfileId();
            this.profileName = profileName;
            this.projectGroupId = g.getProjectGroupId();
            this.groupName = groupName;
            this.projectName = projectName;
            this.role = g.getRole() != null ? g.getRole().name() : null;
            this.source = g.getSource() != null ? g.getSource().name() : null;
            this.invitationType = g.getInvitationType() != null ? g.getInvitationType().name() : null;
            this.invitationId = g.getInvitationId();
            this.grantedBy = g.getGrantedBy();
            this.grantedByName = grantedByName;
            this.grantedAt = g.getGrantedAt() != null ? g.getGrantedAt().toString() : null;
            this.revokedAt = g.getRevokedAt() != null ? g.getRevokedAt().toString() : null;
        }
    }
}
