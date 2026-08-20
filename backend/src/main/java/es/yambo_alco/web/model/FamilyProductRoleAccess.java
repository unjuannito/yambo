package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class FamilyProductRoleAccess {

    private String projectId;

    @Enumerated(EnumType.STRING)
    private UserProjectGroupRole role;

    public static Set<String> projectIds(User user) {
        return user.getGroupRoles().stream()
                .map(gr -> gr.getProjectGroup().getProject().getId())
                .collect(Collectors.toSet());
    }

    public static Set<UserProjectGroupRole> roles(User user) {
        return user.getGroupRoles().stream()
                .map(gr -> gr.getRole())
                .collect(Collectors.toSet());
    }

    /** Empty/null roleAccess means no restriction. */
    public static boolean userHasAccess(User user, Set<FamilyProductRoleAccess> roleAccess) {
        if (roleAccess == null || roleAccess.isEmpty()) {
            return true;
        }
        return user.getGroupRoles().stream().anyMatch(gr ->
            roleAccess.contains(
                FamilyProductRoleAccess.builder()
                    .projectId(gr.getProjectGroup().getProject().getId())
                    .role(gr.getRole())
                    .build()
            )
        );
    }
}
