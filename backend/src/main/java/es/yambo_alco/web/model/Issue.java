package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "issue", schema = "public")
public class Issue {

    @Id
    @CustomId
    @EqualsAndHashCode.Include
    private String id;

    @Column(name = "ordered_product_id", nullable = false, unique = true)
    private UUID orderedProductId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.ORDINAL)
    private IssueStatus status;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordered_product_id", insertable = false, updatable = false)
    private OrderProduct orderedProduct;

        @Builder.Default
        @ManyToMany(fetch = FetchType.LAZY)
        @JoinTable(
            name = "issue_order_product",
            joinColumns = @JoinColumn(name = "issue_id"),
            inverseJoinColumns = @JoinColumn(name = "order_product_id")
        )
        private Set<OrderProduct> orderProducts = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    @OneToMany(mappedBy = "issue", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<IssueComment> comments;
}
