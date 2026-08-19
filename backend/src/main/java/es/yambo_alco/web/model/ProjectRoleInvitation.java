package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "project_role_invitation")
public class ProjectRoleInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "project_id", nullable = false, length = 8)
    private String projectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserProjectGroupRole role;

    @Column(length = 320)
    private String email;

    @Column(name = "used_by_user_id", length = 8)
    private String usedByUserId;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_by", nullable = false, length = 8)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public boolean isUsed() {
        return usedByUserId != null && usedAt != null;
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }
}
