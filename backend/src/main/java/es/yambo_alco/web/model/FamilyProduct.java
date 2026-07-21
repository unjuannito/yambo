package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.FamilyProductStatus;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "family_product", schema = "public")
public class FamilyProduct {

    @Id
    @CustomId
    @EqualsAndHashCode.Include
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "start_tms", nullable = false)
    private LocalDateTime startTms;

    @Column(name = "end_tms", nullable = false)
    private LocalDateTime endTms;

    @Builder.Default
    @Column(nullable = false)
    @Enumerated(EnumType.ORDINAL)
    private FamilyProductStatus status = FamilyProductStatus.OPEN;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false, unique = true)
    private Profile profile;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "family_product_project",
        joinColumns = @JoinColumn(name = "family_product_id"),
        inverseJoinColumns = @JoinColumn(name = "project_id")
    )
    private Set<Project> projects;

    @ElementCollection
    @CollectionTable(
        name = "family_product_role_access",
        joinColumns = @JoinColumn(name = "family_product_id")
    )
    private Set<FamilyProductRoleAccess> roleAccess;
}