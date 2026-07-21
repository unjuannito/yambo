package es.yambo_alco.web.model;

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
@Table(name = "parent_invitation")
public class ParentInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "family_product_id", nullable = false, length = 8)
    private String familyProductId;

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
