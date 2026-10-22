package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.UserProjectGroupRole;
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
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserProjectGroupRole role;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProjectGroupId implements Serializable {
        private String user;
        private String projectGroup;
        private UserProjectGroupRole role;
    }
}
