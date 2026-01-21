package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "permission")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {
    @Id
    @CustomId
    @Column(nullable = false, length = 8)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private PermissionResource resource;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 16)
    private PermissionAction action;

    @Builder.Default
    @Column(name = "has_condition", nullable = false)
    private boolean hasCondition = false;

    @Transient
    public String getDescription() {
        if (resource == null || action == null) return id;
        return resource.getValue() + ":" + action.getValue() + (hasCondition ? " (conditional)" : "");
    }
}
