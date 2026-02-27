package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "seo_metadata", schema = "public",
        uniqueConstraints = @UniqueConstraint(columnNames = {"entity_type", "entity_id"}))
public class SeoMetadata {

    @Id
    @CustomId
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 50)
    private SeoEntityType entityType;

    @Column(name = "entity_id", nullable = false, length = 8)
    private String entityId;

    @Column(name = "meta_description", length = 200)
    private String metaDescription;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String keywords = "[]";

    @Column(name = "og_description", length = 300)
    private String ogDescription;

    @Column(length = 200)
    private String slug;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
