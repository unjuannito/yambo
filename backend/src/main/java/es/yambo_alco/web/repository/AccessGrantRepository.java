package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.AccessGrant;
import es.yambo_alco.web.model.enums.InvitationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AccessGrantRepository extends JpaRepository<AccessGrant, Long> {

    List<AccessGrant> findByUserIdOrderByGrantedAtDesc(String userId);

    /** Grants vigentes (no revocados) de un usuario. */
    List<AccessGrant> findByUserIdAndRevokedAtIsNull(String userId);

    /** Grants de una invitación concreta (para mostrar beneficiarios en la tabla de invitaciones). */
    List<AccessGrant> findByInvitationTypeAndInvitationIdOrderByGrantedAtDesc(
            InvitationType invitationType, Long invitationId);

    /** Grants vigentes de un perfil concreto. */
    List<AccessGrant> findByUserIdAndGrantTypeAndProfileIdAndRevokedAtIsNull(
            String userId, es.yambo_alco.web.model.enums.GrantType grantType, String profileId);

    /** Número de grants vigentes de un rol (cualquier grupo), para el guard de borrado (issue #126). */
    long countByGrantTypeAndRoleAndRevokedAtIsNull(
            es.yambo_alco.web.model.enums.GrantType grantType, String role);

    /** Grants vigentes de un rol de grupo concreto. */
    List<AccessGrant> findByUserIdAndGrantTypeAndProjectGroupIdAndRoleAndRevokedAtIsNull(
            String userId, es.yambo_alco.web.model.enums.GrantType grantType,
            String projectGroupId, String role);

    Optional<AccessGrant> findFirstByUserIdAndGrantTypeAndProfileIdAndSourceAndInvitationTypeAndInvitationIdAndRevokedAtIsNull(
            String userId, es.yambo_alco.web.model.enums.GrantType grantType, String profileId,
            es.yambo_alco.web.model.enums.GrantSource source, InvitationType invitationType, Long invitationId);

    Optional<AccessGrant> findFirstByUserIdAndGrantTypeAndProjectGroupIdAndRoleAndSourceAndInvitationTypeAndInvitationIdAndRevokedAtIsNull(
            String userId, es.yambo_alco.web.model.enums.GrantType grantType, String projectGroupId,
            String role,
            es.yambo_alco.web.model.enums.GrantSource source, InvitationType invitationType, Long invitationId);

    /** Revoca (marca revoked_at) todos los grants vigentes de un perfil de un usuario. */
    @Modifying
    @Query("UPDATE AccessGrant ag SET ag.revokedAt = :now "
            + "WHERE ag.userId = :userId AND ag.grantType = 'PROFILE' AND ag.profileId = :profileId AND ag.revokedAt IS NULL")
    int revokeActiveProfileGrants(@Param("userId") String userId, @Param("profileId") String profileId,
                                  @Param("now") LocalDateTime now);

    /** Revoca todos los grants vigentes de un rol de grupo de un usuario. */
    @Modifying
    @Query("UPDATE AccessGrant ag SET ag.revokedAt = :now "
            + "WHERE ag.userId = :userId AND ag.grantType = 'GROUP_ROLE' "
            + "AND ag.projectGroupId = :projectGroupId AND ag.role = :role AND ag.revokedAt IS NULL")
    int revokeActiveGroupRoleGrants(@Param("userId") String userId, @Param("projectGroupId") String projectGroupId,
                                    @Param("role") String role,
                                    @Param("now") LocalDateTime now);
}
