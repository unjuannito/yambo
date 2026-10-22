package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;

import org.springframework.security.core.GrantedAuthority;
import java.util.Set;

@Entity
@Table(name = "profile")
@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile implements GrantedAuthority {
    @Id
    @CustomId
    @EqualsAndHashCode.Include
    private String id;

    @Column(nullable = false)
    private String name;

    @Builder.Default
    @Column(name = "system", nullable = false)
    private boolean system = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "profile_permission",
        joinColumns = @JoinColumn(name = "profile_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> permissions = Set.of();

    @Override
    public String getAuthority() {
        return id;
    }
}
