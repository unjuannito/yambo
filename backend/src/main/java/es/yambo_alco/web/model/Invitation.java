package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "invitations")
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "start_tms", nullable = false)
    private LocalDateTime startTms;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "invited_by")
    private String invitedBy;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "invitation_profile",
        joinColumns = @JoinColumn(name = "invitation_id"),
        inverseJoinColumns = @JoinColumn(name = "profile_id")
    )
    @Builder.Default
    private Set<Profile> profiles = Set.of();
}
