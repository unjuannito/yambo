package es.yambo_alco.web.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import org.springframework.security.core.GrantedAuthority;
import java.util.Set;

@Entity
@Table(name = "profile")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile implements GrantedAuthority {
    @Id
    @CustomId
    private String id;

    @Column(nullable = false)
    private String name;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "profile_permission",
        joinColumns = @JoinColumn(name = "profile_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<Permission> permissions = Set.of();

    @ManyToMany(mappedBy = "profiles", fetch = FetchType.LAZY)
    private Set<FamilyProduct> familyProducts;

    @Override
    public String getAuthority() {
        return id;
    }
}
