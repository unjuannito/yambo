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
@Table(name = "family_product", schema = "public")
public class FamilyProduct {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "end_tms", nullable = false)
    private LocalDateTime endTms;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "family_product_profile",
        joinColumns = @JoinColumn(name = "family_product_id"),
        inverseJoinColumns = @JoinColumn(name = "profile_id")
    )
    private Set<Profile> profiles;
}