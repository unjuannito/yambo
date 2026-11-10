package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "user")
@ToString(exclude = "user")
@Entity
@Table(name = "user_project_group")
@IdClass(UserProjectGroup.UserProjectGroupId.class)
public class UserProjectGroup {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_group_id", nullable = false)
    private ProjectGroup projectGroup;

    @Id
    @Column(name = "role", nullable = false, length = 40)
    private String role;

    /**
     * Desnormalizado de la marca "es equipo" del rol, para poder filtrar el
     * equipo sin un join a project_role (issue #126). Se rellena al crear la
     * pertenencia a partir de {@code ProjectRole.isTeam}.
     */
    @Column(name = "is_team", nullable = false)
    @Builder.Default
    private boolean isTeam = false;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProjectGroupId implements Serializable {
        private String user;
        private String projectGroup;
        private String role;
    }
}
