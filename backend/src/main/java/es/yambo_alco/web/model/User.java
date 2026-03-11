package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"password", "profiles", "groupRoles"})
@Entity
@Table(name = "user", schema = "public")
public class User implements UserDetails {

    @Id
    @CustomId
    private String id;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_profile",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "profile_id")
    )
    private Set<Profile> profiles;

    private LocalDateTime createdAt;

    @Builder.Default
    private boolean enabled = true;

    @Builder.Default
    @Column(name = "system", nullable = false)
    private boolean system = false;

    @Column(length = 500)
    private String photo;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "fun_fact", length = 100)
    private String funFact;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "notification_preferences", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private NotificationPreferences notificationPreferences;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<UserProjectGroup> groupRoles = new HashSet<>();

    public Set<ProjectGroup> getGroups() {
        return groupRoles.stream()
                .map(UserProjectGroup::getProjectGroup)
                .collect(Collectors.toSet());
    }

    public Set<ProjectGroup> getMonitorGroups() {
        return groupRoles.stream()
                .filter(gr -> gr.getRole() == UserProjectGroupRole.MONITOR)
                .map(UserProjectGroup::getProjectGroup)
                .collect(Collectors.toSet());
    }

    public Set<ProjectGroup> getCoordinatorGroups() {
        return groupRoles.stream()
                .filter(gr -> gr.getRole() == UserProjectGroupRole.COORDINATOR)
                .map(UserProjectGroup::getProjectGroup)
                .collect(Collectors.toSet());
    }

    public boolean hasRoleInProject(UserProjectGroupRole role, String projectId) {
        return groupRoles.stream()
                .anyMatch(gr -> gr.getRole() == role
                        && gr.getProjectGroup().getProject().getId().equals(projectId));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();
        for (Profile profile : profiles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + profile.getId()));
            for (Permission permission : profile.getPermissions()) {
                authorities.add(new SimpleGrantedAuthority(permission.getId()));
            }
        }
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
