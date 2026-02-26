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
@Table(name = "nominative_invitations")
public class NominativeInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String token;

    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    private LocalDateTime createdAt;

    private LocalDateTime expiresAt;

    private String invitedBy;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "nominative_invitation_profile",
        joinColumns = @JoinColumn(name = "nominative_invitation_id"),
        inverseJoinColumns = @JoinColumn(name = "profile_id")
    )
    @Builder.Default
    private Set<Profile> profiles = Set.of();
}
