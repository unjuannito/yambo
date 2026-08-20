package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Registro de cada uso de un link de invitación por rol.
 * Guarda quién se registró nuevo a través del link y quién adquirió el rol.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "project_role_invitation_usage")
public class ProjectRoleInvitationUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invitation_id", nullable = false)
    private Long invitationId;

    @Column(name = "user_id", nullable = false, length = 8)
    private String userId;

    @Column(name = "user_email", length = 320)
    private String userEmail;

    @Column(name = "user_name", length = 200)
    private String userName;

    /** true si el usuario se registró nuevo usando este link. */
    @Column(name = "was_new_registration", nullable = false)
    private boolean wasNewRegistration;

    @Column(name = "used_at", nullable = false)
    private LocalDateTime usedAt;
}
