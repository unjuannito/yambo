package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import jakarta.persistence.Transient;

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

    @Column(nullable = false, length = 64)
    private String resource;

    @Column(name = "action", nullable = false, length = 16)
    private String action;

    @Builder.Default
    @Column(name = "has_condition", nullable = false)
    private boolean hasCondition = false;

    @Transient
    public String getDescription() {
        if (resource == null || action == null) return id;
        return resource + ":" + action + (hasCondition ? " (conditional)" : "");
    }
}
