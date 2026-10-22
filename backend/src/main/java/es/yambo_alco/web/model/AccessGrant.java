package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.GrantSource;
import es.yambo_alco.web.model.enums.GrantType;
import es.yambo_alco.web.model.enums.InvitationType;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Auditoría de cómo un usuario obtuvo un perfil o un rol de grupo.
 * <p>
 * Cada fila responde a: ¿quién le dio el acceso? (granted_by), ¿cómo?
 * (source: MANUAL = una persona, INVITATION = una invitación) y, si fue
 * por invitación, ¿de qué tipo y cuál exactamente? (invitation_type + invitation_id).
 * revoked_at se rellena cuando la concesión se retira (historial completo).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "access_grant", schema = "public")
public class AccessGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 8)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "grant_type", nullable = false, length = 20)
    private GrantType grantType;

    /** Solo cuando grantType = PROFILE. */
    @Column(name = "profile_id", length = 8)
    private String profileId;

    /** Solo cuando grantType = GROUP_ROLE. */
    @Column(name = "project_group_id", length = 8)
    private String projectGroupId;

    /** Solo cuando grantType = GROUP_ROLE. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private UserProjectGroupRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GrantSource source;

    /** Solo cuando source = INVITATION. */
    @Enumerated(EnumType.STRING)
    @Column(name = "invitation_type", length = 20)
    private InvitationType invitationType;

    /** Id en la tabla de invitaciones correspondiente (LINK→invitations, NOMINATIVE→nominative_invitations, PROJECT_ROLE→project_role_invitation). */
    @Column(name = "invitation_id")
    private Long invitationId;

    /** Usuario que otorgó la concesión (null en backfills legacy o asignaciones de sistema). */
    @Column(name = "granted_by", length = 8)
    private String grantedBy;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    /** Cuándo se retiró la concesión; null = vigente. */
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
}
